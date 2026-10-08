import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { linkSentTo, messageSentTo } from "./mail";

/*
 * The contact flow from the first word to the answer in the inbox: a visitor writes, the team is
 * told, staff work the message and answer it, the visitor gets the answer, and a member of the
 * public sees only what they wrote themselves. One serial story, because each step needs the one before.
 */

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const visitorName = `Visitante ${stamp}`;
const visitorEmail = `visitante-${stamp}@example.com`;
const visitorText = `Não consigo baixar meus dados (${stamp}).`;
const memberEmail = `membro-${stamp}@example.com`;
const memberPassword = "uma-senha-bem-longa";
const memberText = `Dúvida de cobrança do membro (${stamp}).`;
const baseURL = "http://localhost:3300";
const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

let visitorMessageId = "";

async function chooseSubject(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Assunto" }).click();
  await page.getByRole("option", { name: label }).click();
}

async function openForm(page: Page) {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1, name: "Fale com a gente" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test.describe("a visitor writes", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the form says what is missing before anything is sent", async ({ page }) => {
    await openForm(page);
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Preencha este campo.").first()).toBeVisible();
    await page.getByLabel("Nome").fill("A");
    await page.getByLabel("Mensagem").fill("curta");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Use pelo menos 10 caracteres.")).toBeVisible();
    await expect(page.getByText("Use pelo menos 2 caracteres.")).toBeVisible();
  });

  test("a message is sent, and the team is told by e-mail", async ({ page }) => {
    await openForm(page);
    await page.getByLabel("Nome").fill(visitorName);
    await page.getByLabel("E-mail").fill(visitorEmail);
    await chooseSubject(page, "Suporte");
    await page.getByLabel("Mensagem").fill(visitorText);
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(
      page.getByText("Recebemos sua mensagem e vamos responder por e-mail."),
    ).toBeVisible();

    const notice = await messageSentTo("contato@app.local", "Nova mensagem de contato: Suporte");
    expect(notice.Text).toContain(visitorText);
    expect(notice.Text).toContain(visitorEmail);
  });
});

test.describe("the team works the message", () => {
  test("the message is in the inbox, found by search, and opens as a record", async ({ page }) => {
    await page.goto("/staff/contacts");
    await expect(page.getByRole("heading", { level: 1, name: "Caixa de contatos" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByRole("searchbox", { name: "Buscar mensagem" }).fill(visitorName);
    await expect(page).toHaveURL(/q=/);
    await page.getByRole("link", { name: visitorName }).click();
    await expect(page.getByRole("heading", { level: 1, name: visitorName })).toBeVisible();
    visitorMessageId = new URL(page.url()).pathname.split("/").pop() ?? "";
    await expect(page.getByText(visitorText)).toBeVisible();
    // The previous page stays in the document, hidden, so a stamp is looked for inside the record.
    await expect(page.locator("dl").getByText("Nova", { exact: true })).toBeVisible();
    await expect(page.getByText("Ainda sem resposta.")).toBeVisible();
  });

  test("changing the situation shows on the record", async ({ page }) => {
    await page.goto(`/staff/contacts/${visitorMessageId}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("combobox", { name: "Situação" }).click();
    await page.getByRole("option", { name: "Em atendimento" }).click();
    await expect(page.getByText("Situação atualizada.", { exact: true })).toBeVisible();
    await expect(page.locator("dl").getByText("Em atendimento", { exact: true })).toBeVisible();
  });

  test("the answer goes out by e-mail, is shown with who gave it, and cannot be given twice", async ({
    page,
  }) => {
    await page.goto(`/staff/contacts/${visitorMessageId}`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Escreva a resposta").fill("Os dados ficam na página da conta.");
    await page.getByRole("button", { name: "Enviar resposta" }).click();
    await expect(page.getByText("Resposta enviada.", { exact: true })).toBeVisible();

    const reply = await messageSentTo(visitorEmail, "Resposta à sua mensagem");
    expect(reply.Text).toContain("Os dados ficam na página da conta.");
    expect(reply.Text).toContain(visitorText);
    expect(reply.Text).toContain(`Olá, ${visitorName}.`);

    await expect(
      page.getByText(/Respondida por admin@app\.local em \d{2}\/\d{2}\/\d{4}/),
    ).toBeVisible();
    await expect(page.locator("dl").getByText("Respondida", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar resposta" })).toHaveCount(0);
  });

  test("the inbox filters by situation", async ({ page }) => {
    await page.goto(`/staff/contacts?q=${encodeURIComponent(visitorName)}&status=answered`);
    await expect(page.getByRole("link", { name: visitorName })).toBeVisible();
    await page.goto(`/staff/contacts?q=${encodeURIComponent(visitorName)}&status=archived`);
    // While the page streams in, its server copy can sit hidden next to the client's for an instant.
    await expect(
      page.getByText(`Nada para “${visitorName}” com 1 filtro`).filter({ visible: true }),
    ).toBeVisible();
  });
});

test.describe("a member sees only what they wrote", () => {
  test("a member writes, and finds only their own message under their account", async ({
    browser,
    playwright,
  }) => {
    const api = await playwright.request.newContext({ baseURL });
    await api.post("/api/auth/sign-up/email", {
      headers: { origin: baseURL },
      data: { name: "Membro Teste", email: memberEmail, password: memberPassword },
    });
    await api.get(await linkSentTo(memberEmail));
    const context = await browser.newContext({ baseURL, storageState: await api.storageState() });
    await api.dispose();
    const page = await context.newPage();

    await openForm(page);
    await expect(page.getByText(`Enviando como ${memberEmail}.`)).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveCount(0);
    await expect(page.getByLabel("Nome")).toHaveValue("Membro Teste");
    await chooseSubject(page, "Cobrança");
    await page.getByLabel("Mensagem").fill(memberText);
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Recebemos sua mensagem")).toBeVisible();

    await page.goto("/account/messages");
    await expect(page.getByRole("heading", { level: 1, name: "Minhas mensagens" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cobrança" })).toHaveCount(1);
    await expect(page.getByText(visitorName)).toHaveCount(0);

    await page.getByRole("link", { name: "Cobrança" }).click();
    await expect(page.getByText(memberText)).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar resposta" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Situação" })).toHaveCount(0);

    // Someone else's message does not exist for this member, and neither does the inbox. The page
    // streams, so the status line is already sent as 200 when it decides; what matters is that the
    // text never reaches the browser and the person sees "not found".
    for (const path of [
      `/account/messages/${visitorMessageId}`,
      "/staff/contacts",
      "/account/messages/not-an-id",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
      const html = await page.content();
      expect(html).not.toContain(visitorText);
      expect(html).not.toContain(visitorName);
    }
    await context.close();
  });

  test("a visitor without a session is sent to sign-in to reach the inbox", async ({ browser }) => {
    // A new context inherits the project's signed-in admin unless it is told otherwise.
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto("/staff/contacts");
    expect(new URL(page.url()).pathname).toBe("/sign-in");
    expect(new URL(page.url()).searchParams.get("next")).toBe("/staff/contacts");
    await context.close();
  });
});

for (const theme of ["light", "dark"] as const) {
  test(`the contact form, the inbox and a record have no accessibility violations in the ${theme} theme`, async ({
    page,
  }) => {
    await page.context().addCookies([{ name: "theme", value: theme, url: baseURL }]);
    for (const path of ["/contact", "/staff/contacts", `/staff/contacts/${visitorMessageId}`]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(
        results.violations.map(
          (violation) =>
            `${path} ${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
        ),
      ).toEqual([]);
    }
  });
}
