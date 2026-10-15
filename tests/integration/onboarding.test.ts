import { describe, expect, it } from "vitest";
import type { OnboardingStep } from "@/domain/onboarding/step";
import { onboardingSteps } from "@/domain/onboarding/steps";
import {
  finishOnboardingStep,
  finishStepsOfPreference,
  readOnboarding,
} from "@/lib/onboarding/service";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();

// The product's own steps, so the rules are proven on the list the product ships.
const steps: readonly OnboardingStep[] = onboardingSteps;
const [first, second] = steps;
const final = steps.find((step) => step.final === true);
const beforeFinal = steps.find((step) => step.final !== true);
const finalOfPreference = steps.find(
  (step) => step.final === true && step.preference !== undefined,
);

describe("the first steps of an account", () => {
  it("start empty, point at the first step, and remember what was finished", async () => {
    const ana = await createUser(db, "ana@example.com");
    expect(await readOnboarding(db, ana.id)).toMatchObject({ doneCount: 0, next: first?.id });
    const { progress } = await finishOnboardingStep(db, ana.id, first?.id ?? "");
    expect(progress).toMatchObject({ doneCount: 1, next: second?.id ?? null });
    expect(await readOnboarding(db, ana.id)).toMatchObject({ doneCount: 1 });
  });

  it("say activated on the one call that finishes the final step, and never again", async ({
    skip,
  }) => {
    if (final === undefined || beforeFinal === undefined) {
      skip();
    }
    const bia = await createUser(db, "bia@example.com");
    expect((await finishOnboardingStep(db, bia.id, beforeFinal?.id ?? "")).activatedNow).toBe(
      false,
    );
    expect((await finishOnboardingStep(db, bia.id, final?.id ?? "")).activatedNow).toBe(true);
    const again = await finishOnboardingStep(db, bia.id, final?.id ?? "");
    expect(again.activatedNow).toBe(false);
    expect(again.progress.doneCount).toBe(2);
  });

  it("finish the final step of a preference when the account saves it, once", async ({ skip }) => {
    if (finalOfPreference === undefined) {
      skip();
    }
    const dani = await createUser(db, "dani@example.com");
    const preference = finalOfPreference?.preference ?? "";
    expect(await finishStepsOfPreference(db, dani.id, "made-up")).toBe(false);
    expect(await finishStepsOfPreference(db, dani.id, preference)).toBe(true);
    expect(await finishStepsOfPreference(db, dani.id, preference)).toBe(false);
    expect(await readOnboarding(db, dani.id)).toMatchObject({ activated: true, doneCount: 1 });
  });

  it("ignore a step the product does not declare", async () => {
    const caio = await createUser(db, "caio@example.com");
    const { progress } = await finishOnboardingStep(db, caio.id, "made-up");
    expect(progress.doneCount).toBe(0);
  });
});
