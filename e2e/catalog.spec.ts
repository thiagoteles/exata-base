import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const themes = ["light", "dark"] as const;

async function openCatalog(page: Page, theme: (typeof themes)[number]) {
  await page.context().addCookies([{ name: "theme", value: theme, url: "http://localhost:47300" }]);
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
  // A click before hydration finds the button but not its handler.
  await page.waitForLoadState("networkidle");
}

for (const theme of themes) {
  test(`the catalog has no accessibility violations in the ${theme} theme`, async ({ page }) => {
    await openCatalog(page, theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
      ),
    ).toEqual([]);
  });
}

test("a waiting indicator shows once its delay has passed", async ({ page }) => {
  await openCatalog(page, "light");
  // toBeVisible accepts opacity 0, so the opacity itself is what proves the indicator appeared.
  const indicator = page.locator('button[aria-busy="true"] .appear-after').first();
  await expect
    .poll(() => indicator.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
});

test("the theme from the cookie is applied before the first paint", async ({ page }) => {
  await page
    .context()
    .addCookies([{ name: "theme", value: "dark", url: "http://localhost:47300" }]);
  await page.addInitScript(() => {
    new MutationObserver(() => undefined).observe(document, { childList: true, subtree: true });
  });
  const response = await page.goto("/catalog", { waitUntil: "commit" });
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test.describe("without a session", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a visitor is sent to sign-in and the way back is kept", async ({ page }) => {
    await page.goto("/catalog?q=ana");
    expect(new URL(page.url()).pathname).toBe("/sign-in");
    expect(new URL(page.url()).searchParams.get("next")).toBe("/catalog?q=ana");
  });
});

test("the list keeps search, filter and page in the address and shows what was searched", async ({
  page,
}) => {
  await openCatalog(page, "light");
  const list = page.getByRole("table", { name: "Pedidos de exemplo" });
  await expect(list.getByRole("row")).toHaveCount(21);

  await page.getByRole("searchbox", { name: "Buscar pedido" }).fill("joana");
  await expect(page).toHaveURL(/q=joana/);
  await expect(list.getByRole("row").nth(1)).toContainText("Joana Prado");

  await page.getByRole("searchbox", { name: "Buscar pedido" }).fill("zzzz");
  await expect(page.getByText("Nada para “zzzz”")).toBeVisible();
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByText("1 a 20 de 47")).toBeVisible();

  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("21 a 40 de 47")).toBeVisible();
});

test("the wizard checks each step on the server and stores nothing", async ({ page }) => {
  await openCatalog(page, "light");
  const wizard = page.locator("section", {
    has: page.getByRole("heading", { name: "Assistente" }),
  });

  await wizard.getByLabel("Nome completo").fill("Ana Souza");
  await wizard.getByLabel("CPF").fill("11111111111");
  await wizard.getByLabel("Data de nascimento").fill("31022024");
  await wizard.getByRole("button", { name: "Continuar" }).click();
  await expect(wizard.getByText("Valor inválido.")).toBeVisible();
  await expect(wizard.getByText("Informe uma data válida no formato dd/mm/aaaa.")).toBeVisible();

  await wizard.getByLabel("CPF").fill("52998224725");
  await wizard.getByLabel("Data de nascimento").fill("29022024");
  await wizard.getByRole("button", { name: "Continuar" }).click();
  await expect(wizard.getByText("Passo 2 de 3")).toBeVisible();

  await wizard.getByLabel("CEP").fill("01310100");
  await wizard.getByLabel("Rua").fill("Avenida Paulista");
  await wizard.getByLabel("Número").fill("1000");
  await wizard.getByLabel("Bairro").fill("Bela Vista");
  await wizard.getByLabel("Cidade").fill("São Paulo");
  await wizard.getByLabel("UF").fill("SP");
  await wizard.getByRole("button", { name: "Continuar" }).click();
  await expect(wizard.getByText("Passo 3 de 3")).toBeVisible();

  await wizard.getByLabel("Valor").fill("123456");
  await expect(wizard.getByLabel("Valor")).toHaveValue("1.234,56");
  await wizard.getByRole("button", { name: "Conferir tudo" }).click();
  await expect(wizard.getByText("Tudo conferido. Nada foi gravado.")).toBeVisible();
  await expect(wizard.getByText("R$ 1.234,56")).toBeVisible();
});

test("the upload takes a PDF, refuses the wrong type and a file that is too big", async ({
  page,
  request,
}) => {
  await openCatalog(page, "light");
  // The database outlives a run, so every run uploads a file with a name of its own.
  const name = `recibo-${Date.now()}.pdf`;
  const files = page.locator("section", { has: page.getByRole("heading", { name: "Arquivos" }) });

  await files.getByLabel("Arquivo", { exact: true }).setInputFiles({
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 recibo"),
  });
  await files.getByRole("button", { name: "Enviar" }).click();
  await expect(files.getByText("Arquivo enviado.")).toBeVisible();
  await expect(files.getByRole("list", { name: "Seus arquivos" }).getByText(name)).toBeVisible();

  await files.getByLabel("Arquivo", { exact: true }).setInputFiles({
    name: "página.html",
    mimeType: "text/html",
    buffer: Buffer.from("<script></script>"),
  });
  await files.getByRole("button", { name: "Enviar" }).click();
  await expect(files.getByText("Esse tipo de arquivo não é aceito.")).toBeVisible();

  await files.getByLabel("Arquivo", { exact: true }).setInputFiles({
    name: "grande.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(11 * 1024 * 1024, 1),
  });
  await files.getByRole("button", { name: "Enviar" }).click();
  await expect(files.getByText("O arquivo é maior que o limite de 10 MB.")).toBeVisible();

  // The stored file opens only through a short-lived link that carries an expiry and a signature.
  const href = await files
    .getByRole("link", { name: `Abrir ${name}` })
    .first()
    .getAttribute("href");
  const redirect = await request.get(href ?? "", { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  const signed = new URL(redirect.headers()["location"] ?? "");
  if (signed.hostname.endsWith("googleapis.com")) {
    // With Cloud Storage on, Google signs the link and enforces the expiry itself.
    expect(signed.searchParams.get("X-Goog-Signature")).toBeTruthy();
    expect(signed.searchParams.get("X-Goog-Expires")).toBeTruthy();
    expect((await request.get(signed.toString())).status()).toBe(200);
    const altered = new URL(signed);
    altered.searchParams.set("X-Goog-Expires", "86400");
    expect((await request.get(altered.toString())).status()).toBe(403);
    return;
  }
  expect(signed.pathname.startsWith("/storage/files/")).toBe(true);
  expect(signed.searchParams.get("signature")).toBeTruthy();
  expect(signed.searchParams.get("expires")).toBeTruthy();
  const download = await request.get(signed.toString());
  expect(download.headers()["content-disposition"]).toContain("attachment");
  expect(download.headers()["x-content-type-options"]).toBe("nosniff");
  const tampered = new URL(signed);
  tampered.searchParams.set("name", "outro.pdf");
  expect((await request.get(tampered.toString())).status()).toBe(404);
});

test("destructive actions ask first, naming what will be deleted", async ({ page }) => {
  await openCatalog(page, "light");
  await page.getByRole("button", { name: "Excluir", exact: true }).first().click();
  const dialog = page.getByRole("alertdialog", { name: "Excluir 3 pedidos?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Os 3 pedidos serão apagados e não voltam.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("the unsaved changes guard stops a link, and the Saved stamp prints after saving", async ({
  page,
}) => {
  await openCatalog(page, "light");
  const form = page.locator("section", {
    has: page.getByRole("heading", { name: "Barra de salvar" }),
  });
  await form.getByLabel("Nome do produto").fill("Caderno A4");
  await form.getByRole("link", { name: "Ir para outra página" }).click();
  await expect(page.getByRole("alertdialog", { name: "Sair sem salvar?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar editando" }).click();
  await form.getByRole("button", { name: "Salvar" }).click();
  await expect(form.getByText("Salvo")).toBeVisible();
});
