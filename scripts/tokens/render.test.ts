import { describe, expect, it } from "vitest";
import { DEFAULT_SEEDS, generateTheme } from "./generate";
import { renderContrastOverlay } from "./render";

const temperature = { hue: "brand", chromaScale: 1 } as const;
const palettes = (contrast: "standard" | "reinforced") => ({
  light: generateTheme("light", DEFAULT_SEEDS, { temperature, contrast }).palette,
  dark: generateTheme("dark", DEFAULT_SEEDS, { temperature, contrast }).palette,
});
const standard = palettes("standard");
const reinforced = palettes("reinforced");

const variables = (rule: string) =>
  [...rule.matchAll(/--color-([\w-]+):/g)].map((match) => match[1]);
const colorOf = (rule: string, name: string) =>
  new RegExp(`--color-${name}: ([^;]+);`).exec(rule)?.[1];

describe("the stronger contrast overlay", () => {
  it("writes nothing when the stronger palette moves no role", () => {
    expect(renderContrastOverlay(standard, standard)).toBe("");
  });

  it("is one rule for light, for dark, and for a system that is dark, all naming the same roles", () => {
    const css = renderContrastOverlay(standard, reinforced);
    const rules = css.split(/\n\s*\n/).filter((rule) => rule.includes("data-contrast"));
    expect(rules).toHaveLength(3);
    const [light, dark, system] = rules.map(variables);
    expect(light?.length).toBeGreaterThan(0);
    expect(dark).toEqual(light);
    expect(system).toEqual(light);
  });

  it("gives each theme its own stronger value, so a dark page never gets a light color", () => {
    const css = renderContrastOverlay(standard, reinforced);
    const [light = "", dark = ""] = css
      .split(/\n\s*\n/)
      .filter((rule) => rule.includes("data-contrast"));
    expect(colorOf(light, "ink-muted")).not.toBe(colorOf(dark, "ink-muted"));
    expect(colorOf(light, "line-strong")).not.toBe(colorOf(dark, "line-strong"));
  });
});
