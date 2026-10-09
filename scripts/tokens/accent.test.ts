import { describe, expect, it } from "vitest";
import { generateAccent } from "./accent";
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
