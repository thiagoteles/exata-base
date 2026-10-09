import { expect, type Page, test } from "@playwright/test";
import { linkSentTo } from "./mail";

/*
 * The browser tells the server which time zone it is in, and the account page shows the one saved.
 * One serial story on a person of its own: a shared account would be rewritten by any other spec
 * that runs at the same time, whose browser sits in the product's zone. It ends back at that zone.
 * The report is sent by the page after it mounts, so each step reloads until the page shows it.
 */

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

const SECONDS = 1000;
const email = `tz-${Date.now()}@example.com`;
const password = "uma-senha-bem-longa";

async function signIn(page: Page) {
  await page.goto("/sign-in?next=%2Faccount");
  await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
}

async function shows(page: Page, zone: string) {
  await expect
    .poll(
      async () => {
        await page.reload();
        return await page.getByText(zone, { exact: true }).count();
      },
      { timeout: 40 * SECONDS, intervals: [SECONDS] },
    )
    .toBeGreaterThan(0);
}

test.describe("in Tokyo", () => {
  test.use({ timezoneId: "Asia/Tokyo" });
  test("a new account saves the zone of the browser that confirmed it", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Nome", { exact: true }).fill("Ana Souza");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText(`Enviamos um link de confirmação para ${email}`)).toBeVisible();
    await page.goto(await linkSentTo(email));
    await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
    await shows(page, "Asia/Tokyo");
  });
});

test.describe("then in Recife", () => {
  test.use({ timezoneId: "America/Recife" });
  test("a person who travels is followed, the saved zone changing with the browser", async ({
    page,
  }) => {
    await signIn(page);
    await shows(page, "America/Recife");
  });
});

test.describe("and back home", () => {
  test("the product's own zone is the one left behind", async ({ page }) => {
    await signIn(page);
    await shows(page, "America/Sao_Paulo");
  });
});
