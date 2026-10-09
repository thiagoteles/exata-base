import { expect, test } from "@playwright/test";
import { newPerson, signInAs, signUpAndConfirm } from "./person";

test.use({ storageState: { cookies: [], origins: [] } });

test("a second browser shows up as a device, and ending it signs that browser out", async ({
  page,
  browser,
}) => {
  const person = newPerson("aparelhos");
  await signUpAndConfirm(page, person);
  await page.waitForLoadState("networkidle");
  const section = page.getByRole("heading", { name: "Aparelhos conectados" });
  await expect(section).toBeVisible();
  await expect(page.getByText("Este aparelho")).toBeVisible();
  // Alone, there is nothing to end.
  await expect(page.getByRole("button", { name: "Encerrar todos os outros" })).toHaveCount(0);

  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await signInAs(other, person);

  await page.reload();
  await expect(page.getByRole("button", { name: "Encerrar", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Encerrar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Encerrar", exact: true })).toHaveCount(0);
  await expect(page.getByText("Este aparelho")).toBeVisible();

  // The browser that was ended is signed out the next time it asks for something.
  await other.goto("/account");
  await expect(other.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
  await otherContext.close();
});
