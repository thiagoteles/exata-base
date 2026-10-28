import { expect, type Page } from "@playwright/test";
import { expectAccountPage } from "./environment";
import { linkSentTo } from "./mail";

/*
 * A person of a spec's own. A spec that changes an account cannot share the seeded admin: any other
 * spec running at the same time reads and rewrites the same preferences. This signs one up, confirms
 * the e-mail from the inbox like a person would, and signs them in again in a later browser.
 */

export type Person = { email: string; password: string };

export const newPerson = (prefix: string): Person => ({
  email: `${prefix}-${Date.now()}@example.com`,
  password: "uma-senha-bem-longa",
});

/** Signs up and follows the confirmation link, which leaves the person on their account page. */
export async function signUpAndConfirm(page: Page, person: Person): Promise<void> {
  await page.goto("/sign-up");
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Ana Souza");
  await page.getByRole("textbox", { name: "E-mail" }).fill(person.email);
  await page
    .getByLabel("Senha", { exact: true })
    .and(page.locator(":visible"))
    .fill(person.password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(
    page.getByText(`Enviamos um link de confirmação para ${person.email}`),
  ).toBeVisible();
  await page.goto(await linkSentTo(person.email));
  await expectAccountPage(page);
}

export async function signInAs(page: Page, person: Person): Promise<void> {
  await page.goto("/sign-in?next=%2Faccount");
  await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "E-mail" }).fill(person.email);
  await page
    .getByLabel("Senha", { exact: true })
    .and(page.locator(":visible"))
    .fill(person.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expectAccountPage(page);
  await page.waitForLoadState("networkidle");
}
