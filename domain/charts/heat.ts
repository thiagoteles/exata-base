/*
 * Which step of the sequential ramp a value takes in a heat map whose cells carry their own label.
 * The middle step (5) is left out: neither the dark nor the light text reaches 4.5:1 on it in the
 * dark theme, so a label on it would not be readable. Steps 1 to 4 take dark text, 6 and 7 light.
 * Zero is step 0, an empty cell, so a value that never happened is told apart from a small one.
 */

const STEPS = [1, 2, 3, 4, 6, 7] as const;
export type HeatStep = 0 | (typeof STEPS)[number];

export function heatStep(value: number, max: number): HeatStep {
  if (!(value > 0 && max > 0)) {
    return 0;
  }
  const index = Math.ceil((Math.min(value, max) / max) * STEPS.length) - 1;
  return STEPS[Math.max(0, index)] ?? 7;
}

/** Whether the label on a step is the light text: only on the two darkest steps. */
export const takesLightText = (step: HeatStep): boolean => step >= 6;
