import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isSampled, samplePoint } from "./sample";

describe("sampling", () => {
  it("places every key in [0, 1), the same place every time", () => {
    fc.assert(
      fc.property(fc.string(), (key) => {
        const point = samplePoint(key);
        expect(point).toBeGreaterThanOrEqual(0);
        expect(point).toBeLessThan(1);
        expect(samplePoint(key)).toBe(point);
      }),
    );
  });

  it("takes nothing at rate 0, everything at rate 1, and a key in a sample stays in a larger one", () => {
    fc.assert(
      fc.property(fc.string(), fc.double({ min: 0, max: 1, noNaN: true }), (key, rate) => {
        expect(isSampled(key, 0)).toBe(false);
        expect(isSampled(key, 1)).toBe(true);
        if (isSampled(key, rate)) {
          expect(isSampled(key, Math.min(1, rate + 0.1))).toBe(true);
        }
      }),
    );
  });

  it("takes close to the rate from ids that differ in a few digits", () => {
    const ids = Array.from({ length: 20_000 }, (_, index) => `v5-1760000000000-${index}`);
    const share = ids.filter((id) => isSampled(id, 0.1)).length / ids.length;
    expect(share).toBeGreaterThan(0.09);
    expect(share).toBeLessThan(0.11);
  });
});
