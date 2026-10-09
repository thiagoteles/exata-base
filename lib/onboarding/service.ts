import {
  completeStep,
  type OnboardingProgress,
  onboardingProgress,
  onboardingSteps,
} from "@/domain/onboarding/steps";
import type { Database } from "@/lib/db/database";
import { readPreferences, savePreference } from "@/lib/preferences/service";

/** Where the person stands in the first steps. */
export async function readOnboarding(db: Database, userId: string): Promise<OnboardingProgress> {
  return onboardingProgress(onboardingSteps, (await readPreferences(db, userId)).onboarding);
}

/**
 * Records one step as done and returns the new standing. `activatedNow` is true on the one call
 * that finishes the final step, so the caller sends the activated event exactly once.
 */
export async function finishOnboardingStep(
  db: Database,
  userId: string,
  id: string,
): Promise<{ progress: OnboardingProgress; activatedNow: boolean }> {
  const saved = (await readPreferences(db, userId)).onboarding;
  const result = completeStep(onboardingSteps, saved, id);
  if (result.done.length !== saved.length) {
    await savePreference(db, userId, "onboarding", result.done);
  }
  return {
    progress: onboardingProgress(onboardingSteps, result.done),
    activatedNow: result.activatedNow,
  };
}
