import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { css, DEFAULT_SEEDS, generateTheme, measure, parseSeeds, type Seeds } from "./generate";

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

  // Fails when a product that sets its own neutral hue still gets neutrals turned from the brand.
  it("gives the neutrals a hue of their own when the product sets one", () => {
    const seeds = parseSeeds({ brand: { hue: 175, chroma: 0.13 }, neutral: { hue: 260 } });
    for (const theme of themes) {
      const { palette } = generateTheme(theme, seeds);
      expect(palette.background.h).toBeCloseTo(260, 0);
      expect(palette.ink.h).toBeCloseTo(260, 0);
      expect(palette.brand.h).toBeCloseTo(175, 0);
    }
    expect(() => parseSeeds({ brand: { hue: 175, chroma: 0.13 }, neutral: { hue: 400 } })).toThrow(
      "neutral.hue",
    );
  });

  // Fails when a brand-colored action leaves its own text below 4.5:1 for some brand.
  it("puts the action in the brand color, readable in both themes, for any brand hue", () => {
    for (let hue = 0; hue < 360; hue += 15) {
      let seeds: ReturnType<typeof parseSeeds>;
      try {
        seeds = parseSeeds({
          brand: { hue, chroma: 0.13 },
          neutral: { offset: 0 },
          action: "brand",
        });
      } catch {
        // A hue too close to success is refused before any action is made.
        continue;
      }
      for (const theme of themes) {
        const { palette, report } = generateTheme(theme, seeds);
        expect(palette.action.h).toBeCloseTo(hue, 0);
        expect(report.filter((pair) => pair.ratio < pair.minimum)).toEqual([]);
      }
    }
    expect(() =>
      parseSeeds({ brand: { hue: 175, chroma: 0.13 }, neutral: { offset: 0 }, action: "gold" }),
    ).toThrow("action");
  });
});

// A product that keeps the palette it already had pins its roles; the old LotoExata is the example.
describe("pinned colors", () => {
  const seeds = (pins: unknown) =>
    parseSeeds({ brand: { hue: 175, chroma: 0.13 }, neutral: { offset: 0, hue: 260 }, pins });
  const pinned = seeds({
    light: {
      background: "oklch(98% 0.01 260)",
      ink: "oklch(20% 0.02 260)",
      "line-strong": "oklch(64% 0.02 260)",
      action: "oklch(48% 0.13 175)",
    },
  });

  it("keeps a pinned role exactly as written in the standard palette, the action included", () => {
    const { palette } = generateTheme("light", pinned);
    expect(css(palette.background)).toBe("oklch(98% 0.01 260)");
    expect(css(palette.ink)).toBe("oklch(20% 0.02 260)");
    expect(css(palette["line-strong"])).toBe("oklch(64% 0.02 260)");
    expect(css(palette.action)).toBe("oklch(48% 0.13 175)");
  });

  it("moves a pinned role when the person asked for more contrast", () => {
    const { palette } = generateTheme("light", pinned, {
      temperature: { hue: "brand", chromaScale: 1 },
      contrast: "reinforced",
    });
    expect(palette["line-strong"].l).toBeLessThan(0.64);
  });

  it("refuses a pin that fails its contrast pair, and names the pair", () => {
    expect(() => generateTheme("light", seeds({ light: { ink: "oklch(80% 0.02 260)" } }))).toThrow(
      /ink on/,
    );
  });

  it("refuses a role that does not exist and a color not written as oklch", () => {
    expect(() => seeds({ light: { text: "oklch(20% 0.02 260)" } })).toThrow(/not a role/);
    expect(() => seeds({ light: { ink: "#11161f" } })).toThrow(/oklch\(L% C H\)/);
    expect(() => seeds({ dusk: {} })).toThrow(/not a theme/);
  });
});
