import { expect, test } from "@playwright/test";
import { appUrl, hasClerkKeys } from "./keys";

test.skip(!hasClerkKeys, "Needs Clerk's development keys.");

test("a person signed in through Clerk reaches the account page, with a row of their own", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { level: 1, name: "Minha conta" })).toBeVisible();
});

test("a visitor is sent to sign-in and comes back to the page they asked for", async ({
  browser,
}) => {
  // The project's saved session is applied to every new context, so a visitor starts empty on purpose.
  const context = await browser.newContext({
    baseURL: appUrl,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto("/account");
  expect(new URL(page.url()).pathname).toBe("/sign-in");
  expect(new URL(page.url()).searchParams.get("next")).toBe("/account");
  await context.close();
});
