import { describe, expect, it } from "vitest";
import { generateAccent, parseAccents } from "./accent";
import { DEFAULT_SEEDS, generateTheme } from "./generate";

describe("scoped accent generator", () => {
  it("finds a passing accent for every hue and chroma, in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const base = generateTheme(theme, DEFAULT_SEEDS).palette;
      for (let hue = 0; hue < 360; hue += 5) {
        for (const chroma of [0.04, 0.1, 0.16, 0.2]) {
          const { report } = generateAccent(theme, "sample", { hue, chroma }, base);
          expect(report.filter((pair) => pair.ratio < pair.minimum)).toEqual([]);
        }
      }
    }
  });
});

describe("fixed accent", () => {
  // Saturated and light colors a third party owns: yellow, lime and orange, plus a mid red and blue.
  const owned = {
    yellow: { hue: 95, chroma: 0.19, fixed: { lightness: 0.92 } },
    lime: { hue: 128, chroma: 0.28, fixed: { lightness: 0.88 } },
    orange: { hue: 52, chroma: 0.2, fixed: { lightness: 0.75 } },
    red: { hue: 27, chroma: 0.24, fixed: { lightness: 0.55 } },
    blue: { hue: 255, chroma: 0.2, fixed: { lightness: 0.5 } },
  };

  it("keeps the fill exactly as given and passes every text pair in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const base = generateTheme(theme, DEFAULT_SEEDS).palette;
      for (const [name, seed] of Object.entries(owned)) {
        const { palette, report } = generateAccent(theme, name, seed, base);
        expect(palette.accent.l).toBeCloseTo(seed.fixed.lightness, 1);
        expect(report.filter((pair) => pair.ratio < pair.minimum)).toEqual([]);
        expect(report.some((pair) => pair.foreground === "accent-ink")).toBe(true);
      }
    }
  });

  it("finds readable text for any color a third party could own, in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const base = generateTheme(theme, DEFAULT_SEEDS).palette;
      for (let hue = 0; hue < 360; hue += 15) {
        for (const lightness of [0.3, 0.45, 0.6, 0.75, 0.9]) {
          for (const chroma of [0.02, 0.15, 0.3]) {
            const { report } = generateAccent(
              theme,
              "sample",
              { hue, chroma, fixed: { lightness } },
              base,
            );
            expect(report.filter((pair) => pair.ratio < pair.minimum)).toEqual([]);
          }
        }
      }
    }
  });

  it("is the same fill in the light and the dark theme", () => {
    const light = generateAccent(
      "light",
      "yellow",
      owned.yellow,
      generateTheme("light", DEFAULT_SEEDS).palette,
    );
    const dark = generateAccent(
      "dark",
      "yellow",
      owned.yellow,
      generateTheme("dark", DEFAULT_SEEDS).palette,
    );
    expect(dark.palette.accent).toEqual(light.palette.accent);
  });
});

describe("reading accents from design.json", () => {
  it("takes a fixed accent with its lightness and refuses the half-declared ones", () => {
    expect(
      parseAccents({ accents: { sol: { hue: 95, chroma: 0.19, fixed: true, lightness: 0.92 } } }),
    ).toEqual({ sol: { hue: 95, chroma: 0.19, fixed: { lightness: 0.92 } } });
    expect(() =>
      parseAccents({ accents: { sol: { hue: 95, chroma: 0.19, fixed: true } } }),
    ).toThrow("lightness");
    expect(() =>
      parseAccents({ accents: { sol: { hue: 95, chroma: 0.19, lightness: 0.9 } } }),
    ).toThrow("fixed");
    expect(() => parseAccents({ accents: { sol: { hue: 95, chroma: 0.3 } } })).toThrow("chroma");
  });
});
