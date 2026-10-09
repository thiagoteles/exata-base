import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { accountIsFree, BILLING_ON, billingIsOff, PLAN_PAID } from "./environment";

/*
 * The compose runs with billing off, which is the state of a fresh product: no price on sale, no
 * checkout, the webhook closed. The paid path with real keys is proved by the signed-event
 * integration tests and, by hand, with Stripe test keys.
 */

const themes = ["light", "dark"] as const;

async function open(page: Page, path: string, theme: (typeof themes)[number], heading: string) {
  await page.context().addCookies([{ name: "theme", value: theme, url: "http://localhost:47300" }]);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

async function violations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
  );
}

for (const theme of themes) {
  test(`the plans page and the account plan have no accessibility violations in the ${theme} theme`, async ({
    page,
  }) => {
    await open(page, "/planos", theme, "Planos");
    expect(await violations(page)).toEqual([]);
    await open(page, "/account/plan", theme, "Meu plano");
    expect(await violations(page)).toEqual([]);
  });
}

test("with billing off the plans page says nothing is on sale and the footer hides the link", async ({
  page,
  request,
}) => {
  test.skip(!(await billingIsOff(request)), BILLING_ON);
  await open(page, "/planos", "light", "Planos");
  await expect(page.getByText("Os planos ainda não estão à venda.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Assinar" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Rodapé" }).getByText("Planos")).toHaveCount(0);
});

test("a free account sees its plan, and no portal or cancellation without a subscription", async ({
  page,
}) => {
  test.skip(!(await accountIsFree(page)), PLAN_PAID);
  await open(page, "/account/plan", "light", "Meu plano");
  const record = page.getByRole("term").filter({ hasText: "Plano" }).first();
  await expect(record).toBeVisible();
  await expect(page.getByText("Gratuito", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver planos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerenciar pagamento" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancelar no fim do período" })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Navegação da área logada" }).getByRole("link", {
      name: "Meu plano",
    }),
  ).toBeVisible();
});

test("the catalog's paid block stays shut for the free plan and points to the plans", async ({
  page,
}) => {
  test.skip(!(await accountIsFree(page)), PLAN_PAID);
  await open(page, "/catalog", "light", "Catálogo");
  const block = page.locator("section", {
    has: page.getByRole("heading", { name: "Plano pago" }),
  });
  await expect(block.getByRole("heading", { name: "Este bloco é do plano pago" })).toBeVisible();
  // The link says where the offer was seen, so the purchase can be traced back to it.
  await expect(block.getByRole("link", { name: "Ver planos" })).toHaveAttribute(
    "href",
    "/planos?source=catalog",
  );
});

test("the payment webhook accepts nothing while billing is off", async ({ request }) => {
  test.skip(!(await billingIsOff(request)), BILLING_ON);
  const response = await request.post("/api/webhooks/stripe", {
    data: "{}",
    headers: { "stripe-signature": "t=1,v1=00" },
  });
  expect(response.status()).toBe(404);
});

test.describe("without a session", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the account plan sends a visitor to sign-in, the plans page stays public", async ({
    page,
  }) => {
    await page.goto("/account/plan");
    expect(new URL(page.url()).pathname).toBe("/sign-in");
    await page.goto("/planos");
    await expect(page.getByRole("heading", { level: 1, name: "Planos" })).toBeVisible();
  });
});
