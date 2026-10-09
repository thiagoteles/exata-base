import { expect, test } from "@playwright/test";
import { newPerson, signInAs, signUpAndConfirm } from "./person";

/*
 * An invitation from end to end: a person has a link, a visitor arrives by it and signs up, and the
 * inviter's page counts them. Two accounts of the spec's own, in one serial story.
 */

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });

const inviter = newPerson("inviter");
const guest = newPerson("guest");
let link = "";

test("a new account has a link of its own, and nobody has used it", async ({ page }) => {
  await signUpAndConfirm(page, inviter);
  await expect(page.getByText("Ninguém criou conta pelo seu link ainda.")).toBeVisible();
  const shown = await page
    .getByText(/\/\?ref=[a-z0-9]{12}$/)
    .first()
    .textContent();
  link = shown?.trim() ?? "";
  expect(link).toMatch(/^http:\/\/localhost:3300\/\?ref=[a-z0-9]{12}$/);
});

test("someone who arrives by the link is remembered, and counted once they sign up", async ({
  page,
}) => {
  await page.goto(link);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Remembered by the server only: a script on the page cannot read it.
  const cookie = (await page.context().cookies()).find((entry) => entry.name === "ref");
  expect(cookie?.value).toBe(link.split("ref=")[1]);
  expect(cookie?.httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain("ref=");

  await signUpAndConfirm(page, guest);
  // Used up: the cookie goes once the account is made.
  expect((await page.context().cookies()).some((entry) => entry.name === "ref")).toBe(false);
});

test("the inviter's page counts the person who came", async ({ page }) => {
  await signInAs(page, inviter);
  await expect(page.getByText("1 pessoa criou conta pelo seu link.")).toBeVisible();
});

test("a link is no use to its own owner, and a made-up code counts for nobody", async ({
  page,
}) => {
  // The inviter opens their own link while signed in and signs in again: still only the guest.
  await page.goto(link);
  await signInAs(page, inviter);
  await expect(page.getByText("1 pessoa criou conta pelo seu link.")).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/?ref=000000000000");
  await signInAs(page, guest);
  // The guest was invited already, and a made-up code adds no one anywhere.
  await signInAs(page, inviter);
  await expect(page.getByText("1 pessoa criou conta pelo seu link.")).toBeVisible();
});

test("a code that is not a code is not even remembered", async ({ page }) => {
  for (const bad of ["x", "ABC", "<script>alert(1)</script>", "0".repeat(40)]) {
    await page.goto(`/?ref=${encodeURIComponent(bad)}`);
    expect((await page.context().cookies()).some((entry) => entry.name === "ref")).toBe(false);
  }
});
