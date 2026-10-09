/*
 * The first steps of a new account. A product lists its own in `onboardingSteps`; the last one
 * marked `final` is what the product calls activation, and finishing it is the moment the funnel's
 * activated event is sent. Everything here is pure: what was done comes in, what is left goes out.
 */

export type OnboardingStep = { readonly id: string; readonly final?: true };

/** What the base ships; a product replaces the list with the steps that make its own first minutes. */
export const onboardingSteps = [
  { id: "look" },
  { id: "email" },
  { id: "invite", final: true },
] as const;

export type OnboardingStepId = (typeof onboardingSteps)[number]["id"];

export const MAX_STEP_ID_LENGTH = 40;
export const MAX_STEPS = 50;

export type OnboardingProgress = {
  /** Every declared step with whether it is done, in the order the product declared. */
  steps: { id: string; done: boolean }[];
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
  const listed = steps.map((step) => ({ id: step.id, done: finished.has(step.id) }));
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
