import { expect, test } from "@playwright/test";
import type { OnboardingStep } from "../domain/onboarding/step";
import { onboardingSteps } from "../domain/onboarding/steps";
import { newPerson, signUpAndConfirm } from "./person";

test.use({ storageState: { cookies: [], origins: [] } });

// The product's own steps: the ones a person ticks, and whether the final one is the e-mail choice.
const steps: readonly OnboardingStep[] = onboardingSteps;
const total = steps.length;
const tickable = steps.filter((step) => step.byApp !== true).length;
const finalIsEmailChoice = steps.some((step) => step.final === true && step.preference === "email");

test("the first steps fill in one by one and leave the account page when done", async ({
  page,
}) => {
  await signUpAndConfirm(page, newPerson("passos"));
  await page.waitForLoadState("networkidle");
  const panel = page.getByRole("heading", { name: "Primeiros passos" });
  await expect(panel).toBeVisible();
  const bar = page.getByRole("progressbar", { name: "Progresso dos primeiros passos" });
  await expect(bar).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByText(`0 de ${total}`)).toBeVisible();

  // The person ticks what is theirs to tick; a step the app finishes has no button.
  for (let index = 1; index <= tickable; index += 1) {
    await page.getByRole("button", { name: "Marcar como feito" }).first().click();
    await expect(page.getByText(`${index} de ${total}`)).toBeVisible();
    await expect(bar).toHaveAttribute("aria-valuenow", String(index));
  }
  await expect(page.getByRole("button", { name: "Marcar como feito" })).toHaveCount(0);
  test.skip(!finalIsEmailChoice, "the product's final step happens elsewhere in the app");

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
