import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/* A record put on file under its parent, found, moved and deleted, the way a person does it. */

async function noViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

test("a sample part goes on file under its sample item, is found, moves and leaves", async ({
  page,
}) => {
  const stamp = Date.now();
  const parent = `Pai ${stamp}`;
  const other = `Outro pai ${stamp}`;
  const name = `Registro ${stamp}`;
  const code = `C-${stamp % 100_000}`;

  // The parents are made through their own form, with only the field every area keeps: the name.
  for (const title of [other, parent]) {
    await page.goto("/sample-items/new");
    await page.waitForLoadState("networkidle");
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill(title);
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }

  // From the parent's page the new record starts under that parent.
  await page.getByRole("link", { name: "Adicionar" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Novo registro de peças" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Registro de amostras" })).toContainText(parent);
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill(name);
  await page.getByRole("textbox", { name: "Código", exact: true }).fill(code.toLowerCase());
  await noViolations(page);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(code, { exact: true })).toBeVisible();
  await noViolations(page);

  // The parent's page lists it, and the parent cannot leave while it is there.
  await page.getByRole("link", { name: parent }).click();
  await expect(page.getByRole("heading", { level: 1, name: parent })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Excluir" }).last().click();
  await expect(page.getByText("Ainda há outros registros ligados a este.").first()).toBeVisible();

  // Found by the parent's name, then moved to the other parent.
  await page.goto(`/sample-parts?q=${encodeURIComponent(parent)}`);
  await expect(page.getByRole("link", { name })).toBeVisible();
  await page.getByRole("link", { name }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Registro de amostras" }).click();
  await page.getByRole("combobox").last().fill(other);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByRole("link", { name: other })).toBeVisible();

  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Este registro será apagado. Não dá para desfazer.")).toBeVisible();
  await page.getByRole("button", { name: "Excluir" }).last().click();
  await expect(page.getByRole("heading", { level: 1, name: "Peças" })).toBeVisible();
  await page.goto(`/sample-parts?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name })).toBeHidden();
});

// With Cache Components the production server sends the prerendered shell, and its 200, before
// the page decides (vercel/next.js#98518); what holds everywhere is the not-found answer itself and
// the noindex that comes with it. The development server also sends a 404.
test("a record the reader may not see is not found, and kept out of search", async ({
  request,
}) => {
  const nobody = "0c6f5c1e-3f4a-4a56-9f0e-8a1d7e5b2c31";
  for (const address of [
    `/sample-parts/${nobody}`,
    `/sample-parts/${nobody}/edit`,
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
