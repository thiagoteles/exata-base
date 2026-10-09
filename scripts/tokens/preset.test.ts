import { describe, expect, it } from "vitest";
import { DEFAULT_SEEDS, generateTheme } from "./generate";
import {
  parseDesign,
  presetNames,
  presetVariables,
  renderFonts,
  renderPresetCss,
  temperatureOf,
} from "./preset";
import { knobs } from "./preset-options";

describe("presets", () => {
  it("make passing colors and complete files for every preset, in both themes", () => {
    for (const name of presetNames) {
      const { preset, choices } = parseDesign({ preset: name });
      const look = { temperature: temperatureOf(choices), contrast: choices.contrast };
      for (const theme of ["light", "dark"] as const) {
        const { report } = generateTheme(theme, DEFAULT_SEEDS, look);
        expect(report.filter((pair) => pair.ratio < pair.minimum)).toEqual([]);
      }
      expect(renderPresetCss(preset, choices)).toContain("--spacing-control:");
      expect(renderFonts(choices)).toContain('variable: "--font-face-sans"');
    }
  });

  it("raises muted text to 7:1 when the contrast is reinforced", () => {
    const { choices } = parseDesign({ preset: "accessible" });
    const look = { temperature: temperatureOf(choices), contrast: choices.contrast };
    const { report } = generateTheme("light", DEFAULT_SEEDS, look);
    const muted = report.filter((pair) => pair.foreground === "ink-muted");
    expect(muted.every((pair) => pair.minimum === 7 && pair.ratio >= 7)).toBe(true);
  });

  it("swaps one knob under adjust and keeps the rest of the preset", () => {
    const { choices } = parseDesign({ preset: "editorial", adjust: { density: "medium" } });
    expect(choices.density).toBe("medium");
    expect(choices.typeface).toBe("editorial");
    expect(presetVariables(choices).some(([name]) => name === "--spacing-row")).toBe(false);
  });

  it("accepts every curated option of every knob", () => {
    for (const [knob, options] of Object.entries(knobs)) {
      for (const option of options) {
        expect(() => parseDesign({ adjust: { [knob]: option } })).not.toThrow();
      }
    }
  });

  it("refuses names outside the curated options", () => {
    expect(() => parseDesign({ preset: "brutalist" })).toThrow("preset must be one of");
    expect(() => parseDesign({ adjust: { density: "tiny" } })).toThrow("adjust.density");
    expect(() => parseDesign({ adjust: { glow: "on" } })).toThrow("is not a knob");
  });
});
