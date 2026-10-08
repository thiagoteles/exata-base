import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_SEEDS, generateTheme, measure, parseSeeds, type Seeds } from "./generate";

const themes = ["light", "dark"] as const;
const failingPair = / on /;

describe("token generator", () => {
  it("passes every contrast pair with the default seeds, in both themes", () => {
    for (const theme of themes) {
      const { report } = generateTheme(theme, DEFAULT_SEEDS);
      expect(report.filter((pair) => pair.ratio < pair.minimum)).toEqual([]);
    }
  });

  it("refuses a brand close to the success hue, so an action never looks like a success", () => {
    for (const hue of [125.5, 150, 174]) {
      expect(() => parseSeeds({ brand: { hue, chroma: 0.13 }, neutral: { offset: 0 } })).toThrow(
        "success",
      );
    }
    expect(() =>
      parseSeeds({ brand: { hue: 120, chroma: 0.13 }, neutral: { offset: 0 } }),
    ).not.toThrow();
  });

  it("refuses seeds that are out of range", () => {
    for (const seeds of [
      { brand: { hue: 400, chroma: 0.13 } },
      { brand: { hue: 245, chroma: 0.5 } },
      { brand: { hue: 245, chroma: 0.13 }, neutral: { offset: 45 } },
      null,
    ]) {
      expect(() => parseSeeds(seeds)).toThrow();
    }
  });

  it("never returns a palette with a failing pair: it fixes the lightness or it throws and names the pair", () => {
    const seeds = fc.record({
      brand: fc.record({
        hue: fc
          .integer({ min: 0, max: 359 })
          .filter((hue) => Math.abs(((hue - 150 + 540) % 360) - 180) >= 25),
        chroma: fc.double({ min: 0.04, max: 0.2, noNaN: true }),
      }),
      neutral: fc.record({ offset: fc.integer({ min: 0, max: 30 }) }),
    });
    fc.assert(
      fc.property(seeds, fc.constantFrom(...themes), (generated: Seeds, theme) => {
        try {
          const { palette } = generateTheme(theme, generated);
          return measure(theme, palette).every((pair) => pair.ratio >= pair.minimum);
        } catch (error) {
          return error instanceof Error && failingPair.test(error.message);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("keeps the action equal to the ink and the focus equal to the brand", () => {
    for (const theme of themes) {
      const { palette } = generateTheme(theme, DEFAULT_SEEDS);
      expect(palette.action).toEqual(palette.ink);
      expect(palette.focus).toEqual(palette.brand);
    }
  });
});
