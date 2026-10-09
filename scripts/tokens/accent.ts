import { clampChroma, type Oklch, wcagContrast } from "culori";
import type { Palette, Theme } from "./generate";

/*
 * A scoped accent is four tokens that a `data-accent` container redefines. Each accent comes from
 * a hue and a chroma, uses the same lightness plan as the brand, and is measured against the
 * grounds of its theme. A pair that falls short moves the foreground's lightness a little; if it
 * still falls short the accent is refused by name.
 */

export const accentTokenNames = ["accent", "accent-wash", "accent-ink", "on-accent"] as const;
type AccentToken = (typeof accentTokenNames)[number];
export type AccentPalette = Record<AccentToken, Oklch>;
export type AccentSeed = { hue: number; chroma: number };
export type AccentReport = {
  theme: Theme;
  accent: string;
  foreground: AccentToken;
  background: string;
  ratio: number;
  minimum: number;
};

const PERCENT = 100;
const MAX_ADJUSTMENT = 14;
const STEP = 0.5;
const READABLE = 4.5;
const NON_TEXT = 3;
const ACCENT_NAME = /^[a-z][a-z0-9-]*$/;

type Plan = Record<Exclude<AccentToken, "on-accent">, { l: number; factor: number }>;

const plans: Record<Theme, Plan> = {
  light: {
    accent: { l: 55, factor: 1 },
    "accent-wash": { l: 94.5, factor: 0.27 },
    "accent-ink": { l: 44, factor: 0.9 },
  },
  dark: {
    accent: { l: 74, factor: 0.85 },
    "accent-wash": { l: 28, factor: 0.3 },
    "accent-ink": { l: 80, factor: 0.7 },
  },
};

const toColor = (l: number, c: number, h: number): Oklch =>
  clampChroma({ mode: "oklch", l: l / PERCENT, c, h }, "oklch") as Oklch;

const grounds = ["surface", "background", "sunken", "layer"] as const;

type Pair = { foreground: AccentToken; backgrounds: readonly string[]; minimum: number };

function groundOf(base: Palette, accent: AccentPalette, name: string): Oklch {
  return name in accent ? accent[name as AccentToken] : base[name as keyof Palette];
}

function worstRatio(base: Palette, accent: AccentPalette, pair: Pair): number {
  return Math.min(
    ...pair.backgrounds.map((name) =>
      wcagContrast(accent[pair.foreground], groundOf(base, accent, name)),
    ),
  );
}

function nudge(theme: Theme, base: Palette, accent: AccentPalette, pair: Pair): AccentPalette {
  const direction = theme === "light" ? -1 : 1;
  const start = accent[pair.foreground];
  let current = accent;
  let offset = 0;
  while (worstRatio(base, current, pair) < pair.minimum && offset < MAX_ADJUSTMENT) {
    offset += STEP;
    const moved = toColor(start.l * PERCENT + direction * offset, start.c, start.h ?? 0);
    current = { ...accent, [pair.foreground]: moved };
  }
  return current;
}

export function generateAccent(
  theme: Theme,
  name: string,
  seed: AccentSeed,
  base: Palette,
): { palette: AccentPalette; report: AccentReport[] } {
  const plan = plans[theme];
  const make = (token: keyof Plan) =>
    toColor(plan[token].l, plan[token].factor * seed.chroma, seed.hue);
  // The text on a filled accent is whichever end of the neutral scale reads better on it.
  const fill = make("accent");
  const light = theme === "light" ? base.surface : base.ink;
  const dark = theme === "light" ? base.ink : base.background;
  const onAccent = wcagContrast(light, fill) >= wcagContrast(dark, fill) ? light : dark;
  let palette: AccentPalette = {
    accent: fill,
    "accent-wash": make("accent-wash"),
    "accent-ink": make("accent-ink"),
    "on-accent": onAccent,
  };
  const pairs: Pair[] = [
    { foreground: "accent", backgrounds: ["surface", "background"], minimum: NON_TEXT },
    // Moving the fill, not its text, keeps the text on every accent the same neutral.
    { foreground: "accent", backgrounds: ["on-accent"], minimum: READABLE },
    { foreground: "accent-ink", backgrounds: [...grounds, "accent-wash"], minimum: READABLE },
  ];
  for (const pair of pairs) {
    palette = nudge(theme, base, palette, pair);
  }
  const measured: Pair[] = [
    ...pairs,
    { foreground: "on-accent", backgrounds: ["accent"], minimum: READABLE },
  ];
  const report = measured.flatMap((pair) =>
    pair.backgrounds.map((background) => ({
      theme,
      accent: name,
      foreground: pair.foreground,
      background,
      ratio: wcagContrast(palette[pair.foreground], groundOf(base, palette, background)),
      minimum: pair.minimum,
    })),
  );
  const failure = report.find((pair) => pair.ratio < pair.minimum);
  if (failure !== undefined) {
    throw new Error(
      `${theme} theme, accent ${name}: ${failure.foreground} on ${failure.background} is ${failure.ratio.toFixed(2)}:1 and needs ${failure.minimum}:1`,
    );
  }
  return { palette, report };
}

export function parseAccents(value: unknown): Record<string, AccentSeed> {
  const accents = (value as { accents?: Record<string, Partial<AccentSeed>> } | null)?.accents;
  const result: Record<string, AccentSeed> = {};
  for (const [name, seed] of Object.entries(accents ?? {})) {
    if (!ACCENT_NAME.test(name) || name === "brand") {
      throw new Error(`accent name "${name}" must be lowercase words and cannot be "brand"`);
    }
    const { hue, chroma } = seed;
    if (typeof hue !== "number" || hue < 0 || hue >= 360) {
      throw new Error(`accents.${name}.hue must be a number from 0 up to 360`);
    }
    if (typeof chroma !== "number" || chroma < 0.04 || chroma > 0.2) {
      throw new Error(`accents.${name}.chroma must be a number from 0.04 to 0.2`);
    }
    result[name] = { hue, chroma };
  }
  return result;
}
