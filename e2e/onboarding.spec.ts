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

  // The person ticks what is theirs to tick; the last step has no button, it is the choice itself.
  for (const [index, done] of ["1 de 3", "2 de 3"].entries()) {
    await page.getByRole("button", { name: "Marcar como feito" }).first().click();
    await expect(page.getByText(done)).toBeVisible();
    await expect(bar).toHaveAttribute("aria-valuenow", String(index + 1));
  }
  await expect(page.getByRole("button", { name: "Marcar como feito" })).toHaveCount(0);

  // Choosing what may come by e-mail is what the base counts as activation, and the panel steps aside.
  const saved = page.waitForResponse((response) => response.request().method() === "POST");
  await page.getByRole("switch", { name: "Novidades" }).click();
  await saved;
  await page.reload();
  await expect(panel).toBeHidden();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Minha conta", level: 1 })).toBeVisible();
  await expect(panel).toBeHidden();
});
