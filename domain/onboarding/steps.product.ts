import type { OnboardingStep } from "./step";

/*
 * The first steps of a new account, the product's own: the last one marked `final` is what the
 * product calls activation. The product owns this file and replaces the list with the steps that
 * make its own first minutes; the base ships these.
 */
export const productOnboardingSteps = [
  { id: "look" },
  { id: "invite" },
  { id: "email", byApp: true, final: true, preference: "email" },
] as const satisfies readonly OnboardingStep[];
