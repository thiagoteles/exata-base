import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/* A record put on file, found, changed and deleted, the way a person does it. */

async function noViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

test("a sample item goes on file, is found, changes and leaves", async ({ page }) => {
  const name = `Registro ${Date.now()}`;
  const code = `C-${Date.now() % 100_000}`;

  await page.goto("/sample-items/new");
  await expect(
    page.getByRole("heading", { level: 1, name: "Novo registro de amostras" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText("Preencha este campo.").first()).toBeVisible();
  await noViolations(page);

  await page.getByRole("textbox", { name: "Nome", exact: true }).fill(name);
  await page.getByRole("textbox", { name: "Código", exact: true }).fill(code.toLowerCase());
  await page.getByRole("textbox", { name: "Prazo", exact: true }).fill("31122026");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(code, { exact: true })).toBeVisible();
  await expect(page.getByText("31/12/2026")).toBeVisible();
  await noViolations(page);

  await page.goto(`/sample-items?q=${encodeURIComponent(code)}`);
  await expect(page.getByRole("link", { name })).toBeVisible();
  await page.getByRole("link", { name }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("textbox", { name: "Prazo", exact: true })).toHaveValue("31/12/2026");
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill(`${name} mudada`);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${name} mudada` })).toBeVisible();

  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Este registro será apagado. Não dá para desfazer.")).toBeVisible();
  await page.getByRole("button", { name: "Excluir" }).last().click();
  await expect(page.getByRole("heading", { level: 1, name: "Amostras" })).toBeVisible();
  await page.goto(`/sample-items?q=${encodeURIComponent(code)}`);
  await expect(page.getByRole("link", { name: `${name} mudada` })).toBeHidden();
});

// With Cache Components the production server sends the prerendered shell, and its 200, before
// the page decides (vercel/next.js#98518); what holds everywhere is the not-found answer itself and
// the noindex that comes with it. The development server also sends a 404.
test("a record the reader may not see is not found, and kept out of search", async ({
  request,
}) => {
  const nobody = "0c6f5c1e-3f4a-4a56-9f0e-8a1d7e5b2c31";
  for (const address of [
    `/sample-items/${nobody}`,
    `/sample-items/${nobody}/edit`,
    `/staff/contacts/${nobody}`,
    `/account/messages/${nobody}`,
    `/print/contacts/${nobody}`,
  ]) {
    const response = await request.get(address);
    expect([200, 404], address).toContain(response.status());
    const page = await response.text();
    expect(page, address).toContain("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(page, address).toContain('<meta name="robots" content="noindex"/>');
  }
});
