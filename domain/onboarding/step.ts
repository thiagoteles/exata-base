/* What one first step of a new account declares. */

/**
 * `byApp` marks a step the product finishes by itself when the thing happens, so the person has no
 * button for it and activation cannot be claimed without doing it. `preference` names the saved
 * choice that finishes it: saving that preference in an account ticks the step.
 */
export type OnboardingStep = {
  readonly id: string;
  readonly final?: true;
  readonly byApp?: true;
  readonly preference?: string;
};
