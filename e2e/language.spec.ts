import { expect, test } from "@playwright/test";
import { messageSentTo } from "./mail";

/*
 * The language choice, proved only when the product has more than one language. The product ships
 * with Portuguese alone, so on a fresh copy every test here is skipped; they run once a second
 * catalog is on the list.
 */

test.beforeAll(async ({ request }) => {
  const probe = await request.get("/en", { maxRedirects: 0 });
  test.skip(probe.status() === 404, "the product has a single language");
});

test.describe("a visitor", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sees Portuguese at the clean address and English under /en, with the document language to match", async ({
    page,
  }) => {
    await page.goto("/planos");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { level: 1, name: "Planos" })).toBeVisible();

    await page.goto("/en/plans");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.getByRole("heading", { level: 1, name: /^EN Planos/ })).toBeVisible();
  });

  test("is sent to the language the browser asks for, and the cookie then wins", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      locale: "en-GB",
    });
    const page = await context.newPage();
    await page.goto("/planos");
    expect(new URL(page.url()).pathname).toBe("/en/plans");

    // Choosing Portuguese in the footer saves the choice, and the browser's preference no longer decides.
    await page.getByRole("combobox", { name: /Idioma/ }).click();
    await page.getByRole("option", { name: /português/i }).click();
    await page.waitForURL((url) => url.pathname === "/planos");
    await page.goto("/planos");
    expect(new URL(page.url()).pathname).toBe("/planos");
    await context.close();
  });

  test("keeps the way back when a protected English page sends to sign-in", async ({ page }) => {
    await page.goto("/en/account");
    expect(new URL(page.url()).pathname).toMatch(/sign-in$/);
  });
});

test("a signed-in person reads English under /en and the sidebar still knows where they are", async ({
  page,
}) => {
  await page
    .context()
    .addCookies([{ name: "NEXT_LOCALE", value: "en-US", url: "http://localhost:47300" }]);
  await page.goto("/en/account");
  await expect(page.getByRole("heading", { level: 1, name: /^EN Minha conta/ })).toBeVisible();
  const current = page
    .getByRole("navigation", { name: /EN Navegação da área logada/ })
    .locator('[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toContainText("EN Minha conta");
});

test("an invite goes out in the language the admin is using", async ({ page }) => {
  const email = `convidada-${Date.now()}@example.com`;
  await page
    .context()
    .addCookies([{ name: "NEXT_LOCALE", value: "en-US", url: "http://localhost:47300" }]);
  await page.goto("/en/admin/invites");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/E-mail de quem vai receber/).fill(email);
  await page.getByRole("button", { name: /Enviar convite/ }).click();
  const message = await messageSentTo(email, "EN Você foi convidado");
  expect(message.Subject).toBe("EN Você foi convidado");
});
