import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { niceTicks } from "./scale";

/*
 * Properties instead of examples: for any largest value, the axis covers it, starts at zero, steps
 * evenly by 1, 2 or 5 times a power of ten, and a count never steps by a fraction.
 */
const isNiceStep = (step: number) => {
  const power = 10 ** Math.floor(Math.log10(step));
  return [1, 2, 5, 10].some((factor) => Math.abs(step - factor * power) < power * 1e-9);
};

describe("nice ticks, for any value", () => {
  it("cover the largest value from zero, in even round steps", () => {
    fc.assert(
      fc.property(fc.double({ min: 1e-6, max: 1e12, noNaN: true }), (max) => {
        const ticks = niceTicks(max);
        const step = (ticks[1] ?? 0) - (ticks[0] ?? 0);
        expect(ticks[0]).toBe(0);
        expect(ticks.at(-1)).toBeGreaterThanOrEqual(max);
        expect(isNiceStep(step)).toBe(true);
        for (const [index, tick] of ticks.entries()) {
          expect(Math.abs(tick - index * step)).toBeLessThan(step * 1e-9);
        }
      }),
    );
  });

  it("step a count by whole numbers", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (max) => {
        const ticks = niceTicks(max, { integer: true });
        expect(ticks.every(Number.isInteger)).toBe(true);
        expect(ticks.at(-1)).toBeGreaterThanOrEqual(max);
      }),
    );
  });
});
