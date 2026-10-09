import { expect, test } from "@playwright/test";

/*
 * The browser tells the server which time zone it is in, and the account page shows the one saved.
 * One serial story on the seeded admin, which ends back at the product's own zone so no other
 * spec meets a changed one. The report is sent by the page after it mounts, so each step reloads
 * until the page shows it.
 */

test.describe.configure({ mode: "serial" });

const SECONDS = 1000;

async function shows(page: import("@playwright/test").Page, zone: string) {
  await page.goto("/account");
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
  test("the zone is saved to the account and shown on it", async ({ page }) => {
    await shows(page, "Asia/Tokyo");
  });
});

test.describe("then in Recife", () => {
  test.use({ timezoneId: "America/Recife" });
  test("a person who travels is followed, the saved zone changing with the browser", async ({
    page,
  }) => {
    await shows(page, "America/Recife");
  });
});

test.describe("and back home", () => {
  test("the product's own zone is the one left behind", async ({ page }) => {
    await shows(page, "America/Sao_Paulo");
  });
});
