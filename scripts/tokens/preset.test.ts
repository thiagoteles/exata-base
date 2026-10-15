import { describe, expect, it } from "vitest";
import { DEFAULT_SEEDS, generateTheme } from "./generate";
import {
  hasFallbackMetrics,
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

  it("sets documents in the face the PDFs embed, whatever the preset, without preloading it", () => {
    for (const name of presetNames) {
      const { preset, choices } = parseDesign({ preset: name });
      const fonts = renderFonts(choices);
      expect(fonts).toContain('variable: "--font-face-document"');
      expect(fonts).toMatch(/Source_Serif_4\(\{[^}]*preload: false/);
      expect(fonts).toContain("document.variable");
      expect(renderPresetCss(preset, choices)).toContain("--font-document:");
    }
  });

  it("offers every density as a scope any element can ask for by name, whatever the preset", () => {
    for (const name of presetNames) {
      const { preset, choices } = parseDesign({ preset: name });
      const css = renderPresetCss(preset, choices);
      for (const density of knobs.density) {
        expect(css).toContain(`[data-density="${density}"] {`);
      }
      // Each scope states every density variable, so asking for one never leaves another behind.
      const scope = (density: string) =>
        css.slice(css.indexOf(`[data-density="${density}"] {`)).split("}")[0] ?? "";
      const variables = (density: string) =>
        [...scope(density).matchAll(/(--[a-z-]+):/g)].map((m) => m[1]);
      expect(variables("comfortable")).toEqual(variables("large"));
      expect(variables("medium")).toEqual(variables("large"));
      // The medium scope is the base the others are measured from.
      expect(scope("medium")).toContain("--spacing-control: 2.75rem;");
      expect(scope("large")).toContain("--spacing-control: 3.25rem;");
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

describe("fallback font metrics", () => {
  it("are known for the common faces and missing for the hyperlegible ones", () => {
    expect(hasFallbackMetrics("Onest")).toBe(true);
    expect(hasFallbackMetrics("IBM_Plex_Mono")).toBe(true);
    expect(hasFallbackMetrics("Atkinson_Hyperlegible_Next")).toBe(false);
  });
});
