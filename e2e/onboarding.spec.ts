import { expect, test } from "@playwright/test";
import { newPerson, signUpAndConfirm } from "./person";

test.use({ storageState: { cookies: [], origins: [] } });

test("the first steps fill in one by one and leave the account page when done", async ({
  page,
}) => {
  await signUpAndConfirm(page, newPerson("passos"));
  await page.waitForLoadState("networkidle");
  const panel = page.getByRole("heading", { name: "Primeiros passos" });
  await expect(panel).toBeVisible();
  const bar = page.getByRole("progressbar", { name: "Progresso dos primeiros passos" });
  await expect(bar).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByText("0 de 3")).toBeVisible();

  for (const [index, done] of ["1 de 3", "2 de 3"].entries()) {
    await page.getByRole("button", { name: "Marcar como feito" }).click();
    await expect(page.getByText(done)).toBeVisible();
    await expect(bar).toHaveAttribute("aria-valuenow", String(index + 1));
  }

  // Finishing the last step is what the product counts as activation, and the panel steps aside.
  await page.getByRole("button", { name: "Marcar como feito" }).click();
  await expect(panel).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Minha conta", level: 1 })).toBeVisible();
  await expect(panel).toBeHidden();
});
