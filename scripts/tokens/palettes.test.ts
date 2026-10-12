import { describe, expect, it } from "vitest";
import { DEFAULT_SEEDS, generateTheme } from "./generate";
import { generatePalettes, parsePalettes } from "./palettes";

const group = {
  category: {
    alpha: { hue: 255, chroma: 0.16, lightness: 0.55 },
    beta: { hue: 60, chroma: 0.17, lightness: 0.75 },
    gamma: { hue: 160, chroma: 0.14, lightness: 0.45 },
    delta: { hue: 295, chroma: 0.14, lightness: 0.4 },
    epsilon: { hue: 20, chroma: 0.17, lightness: 0.62 },
  },
};

describe("domain palettes", () => {
  it("makes a fill and a readable ink for every color, in both themes", () => {
    for (const theme of ["light", "dark"] as const) {
      const base = generateTheme(theme, DEFAULT_SEEDS).palette;
      const { colors, report } = generatePalettes(theme, group, base);
      expect(colors.map((color) => color.name)).toEqual(Object.keys(group.category));
      expect(report.every((entry) => entry.distance >= entry.minimum)).toBe(true);
    }
  });

  it("refuses a group whose neighbors look alike, naming them and the vision", () => {
    const base = generateTheme("light", DEFAULT_SEEDS).palette;
    const twins = {
      pair: {
        one: { hue: 255, chroma: 0.16, lightness: 0.55 },
        two: { hue: 258, chroma: 0.16, lightness: 0.56 },
      },
    };
    expect(() => generatePalettes("light", twins, base)).toThrow(/palette pair: one and two/);
  });

  it("reads groups from design.json and refuses names and numbers out of range", () => {
    expect(parsePalettes({})).toEqual({});
    expect(parsePalettes({ palettes: group })).toEqual(group);
    expect(() => parsePalettes({ palettes: { Bad: {} } })).toThrow("lowercase");
    expect(() => parsePalettes({ palettes: { ok: { Bad: { hue: 1, chroma: 0.1 } } } })).toThrow(
      "lowercase",
    );
    expect(() => parsePalettes({ palettes: { ok: { a: { hue: 400, chroma: 0.1 } } } })).toThrow(
      "hue",
    );
    expect(() => parsePalettes({ palettes: { ok: { a: { hue: 10, chroma: 0.9 } } } })).toThrow(
      "chroma",
    );
    expect(() =>
      parsePalettes({ palettes: { ok: { a: { hue: 10, chroma: 0.1, lightness: 0.99 } } } }),
    ).toThrow("lightness");
  });
});
