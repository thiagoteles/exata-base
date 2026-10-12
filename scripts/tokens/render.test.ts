import { describe, expect, it } from "vitest";
import { DEFAULT_SEEDS, generateTheme, css as oklchOf } from "./generate";
import { renderContrastOverlay, renderPrintCss } from "./render";

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

describe("the print tokens", () => {
  const text = renderPrintCss(standard.light);
  const [screen = "", printed = ""] = text.split("@media print");

  it("size the sheet and the page box, with the page number in the bottom margin", () => {
    expect(text).toContain("--spacing-sheet: 210mm;");
    expect(text).toContain("size: A4;");
    expect(text).toContain('content: counter(page) " / " counter(pages);');
  });

  it("write the margin color out as hex, since a margin box cannot read a variable", () => {
    expect(/@bottom-center \{[^}]*color: #[0-9a-f]{6};/.test(text)).toBe(true);
  });

  it("show a sheet on screen in the light palette, whatever the person's theme", () => {
    expect(colorOf(screen, "surface")).toBe(oklchOf(standard.light.surface));
    expect(colorOf(screen, "ink")).toBe(oklchOf(standard.light.ink));
  });

  it("print every page as ink on paper: grounds and washes are the paper, lines are firm", () => {
    expect(printed).toContain(":root:root:root:root");
    for (const name of ["background", "surface", "sunken", "layer", "brand-wash", "danger-wash"]) {
      expect(colorOf(printed, name)).toBe("oklch(100% 0 0)");
    }
    expect(colorOf(printed, "line")).toBe(oklchOf(standard.light["line-strong"]));
    expect(colorOf(printed, "ink")).toBe(oklchOf(standard.light.ink));
  });
});
