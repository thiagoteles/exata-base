/*
 * The first steps of a new account. A product lists its own in its own steps file; the last one
 * marked `final` is what the product calls activation, and finishing it is the moment the funnel's
 * activated event is sent. Everything here is pure: what was done comes in, what is left goes out.
 */

import type { OnboardingStep } from "./step";
import { productOnboardingSteps } from "./steps.product";

/** The product's steps, from its own file. */
export const onboardingSteps = productOnboardingSteps;

export type OnboardingStepId = (typeof onboardingSteps)[number]["id"];

export const MAX_STEP_ID_LENGTH = 40;
export const MAX_STEPS = 50;

export type OnboardingProgress = {
  /** Every declared step with whether it is done, in the order the product declared. */
  steps: { id: string; done: boolean; byApp: boolean }[];
  doneCount: number;
  total: number;
  /** The first step still to do, or null when all are done. */
  next: string | null;
  complete: boolean;
  /** The final step is done: the person got to what the product counts as the point. */
  activated: boolean;
};

export function onboardingProgress(
  steps: readonly OnboardingStep[],
  done: readonly string[],
): OnboardingProgress {
  const finished = new Set(done);
  const listed = steps.map((step) => ({
    id: step.id,
    done: finished.has(step.id),
    byApp: step.byApp === true,
  }));
  const doneCount = listed.filter((step) => step.done).length;
  const final = steps.find((step) => step.final === true);
  return {
    steps: listed,
    doneCount,
    total: steps.length,
    next: listed.find((step) => !step.done)?.id ?? null,
    complete: steps.length > 0 && doneCount === steps.length,
    activated: final !== undefined && finished.has(final.id),
  };
}

/**
 * Adds one step to what was done. An id the product does not declare changes nothing, and so does a
 * step already done, so repeating a request is harmless. `activatedNow` is true only on the call that
 * finishes the final step, which is how the event is sent once.
 */
export function completeStep(
  steps: readonly OnboardingStep[],
  done: readonly string[],
  id: string,
): { done: string[]; activatedNow: boolean } {
  if (!steps.some((step) => step.id === id) || done.includes(id)) {
    return { done: [...done], activatedNow: false };
  }
  const after = [...done, id];
  return {
    done: after,
    activatedNow:
      !onboardingProgress(steps, done).activated && onboardingProgress(steps, after).activated,
  };
}

/** Whether the person may tick this step themselves; a step the app finishes is not theirs to tick. */
export const canTick = (steps: readonly OnboardingStep[], id: string): boolean =>
  steps.some((step) => step.id === id && step.byApp !== true);

/** The steps that saving this preference finishes. */
export const stepsFinishedBy = (steps: readonly OnboardingStep[], preference: string): string[] =>
  steps.filter((step) => step.preference === preference).map((step) => step.id);
