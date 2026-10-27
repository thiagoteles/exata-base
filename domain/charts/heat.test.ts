import { describe, expect, it } from "vitest";
import { heatStep, takesLightText } from "./heat";

describe("the ramp step of a heat map cell", () => {
  it("leaves zero empty and gives the largest value the darkest step", () => {
    expect(heatStep(0, 10)).toBe(0);
    expect(heatStep(10, 10)).toBe(7);
    expect(heatStep(1, 10)).toBe(1);
    expect(heatStep(5, 10)).toBe(3);
  });

  // Fails when a label lands on the middle step, where no text reads at 4.5:1 in the dark theme.
  it("never uses the middle step, whatever the value", () => {
    const steps = new Set(Array.from({ length: 1001 }, (_, value) => heatStep(value, 1000)));
    expect(steps.has(5 as never)).toBe(false);
    expect([...steps].sort()).toEqual([0, 1, 2, 3, 4, 6, 7]);
  });

  it("puts light text only on the two darkest steps", () => {
    expect([0, 1, 2, 3, 4, 6, 7].filter((step) => takesLightText(step as never))).toEqual([6, 7]);
  });

  it("treats an empty series as all empty, not as a division by zero", () => {
    expect(heatStep(3, 0)).toBe(0);
  });
});
