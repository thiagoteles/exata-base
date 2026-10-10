import { expect, type Page, test } from "@playwright/test";

/*
 * What a person prints. The sheet page is made for paper, and an ordinary signed-in screen prints
 * without its shell too. Both are checked with the print media emulated, and the sheet is made
 * into a PDF to count its pages.
 */

const stamp = Date.now();
const visitorName = `Impressão ${stamp}`;
const PDF_PAGE = /\/Type\s*\/Page(?![a-z])/g;

async function writeAsVisitor(page: Page) {
  await page.goto("/contato");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nome").fill(visitorName);
  await page.getByLabel("E-mail").fill(`impressao-${stamp}@example.com`);
  await page.getByRole("combobox", { name: "Assunto" }).click();
  await page.getByRole("option", { name: "Suporte" }).click();
  await page.getByLabel("Mensagem").fill(`Preciso da ficha impressa (${stamp}).`);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(
    page.getByText("Recebemos sua mensagem e vamos responder por e-mail."),
  ).toBeVisible();
}

test("a message prints as one clean sheet, and its record screen prints without the shell", async ({
  page,
  browser,
}) => {
  const visitor = await browser.newPage({ storageState: { cookies: [], origins: [] } });
  await writeAsVisitor(visitor);
  await visitor.close();

  await page.goto("/staff/contacts");
  await page.waitForLoadState("networkidle");
  await page.getByRole("searchbox", { name: "Buscar mensagem" }).fill(visitorName);
  await page.getByRole("link", { name: visitorName }).click();
  await expect(page.getByRole("heading", { level: 1, name: visitorName })).toBeVisible();

  // The ordinary screen, on paper: no top bar, no sidebar, no controls for working the message.
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("header").first()).toBeHidden();
  await expect(page.locator("aside")).toBeHidden();
  await expect(page.getByText("Tratar mensagem")).toBeHidden();
  await expect(page.getByText(`Preciso da ficha impressa (${stamp}).`)).toBeVisible();
  await page.emulateMedia({ media: "screen" });

  await page.getByRole("link", { name: "Imprimir ficha" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ficha de contato" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimir" })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Imprimir" })).toBeHidden();
  const pdf = await page.pdf({ preferCSSPageSize: true });
  expect(pdf.toString("latin1").match(PDF_PAGE)).toHaveLength(1);
});
