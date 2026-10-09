import { clampChroma, type Oklch, wcagContrast } from "culori";
import type { Palette, Theme } from "./generate";

/*
 * A scoped accent is four tokens that a `data-accent` container redefines. Each accent comes from
 * a hue and a chroma, uses the same lightness plan as the brand, and is measured against the
 * grounds of its theme. A pair that falls short moves the foreground's lightness a little; if it
 * still falls short the accent is refused by name.
 *
 * A fixed accent is a color someone else owns (a brand, a team, a sector): its fill is exactly the
 * color given, in both themes, and only decorates. What is generated around it is what has to be
 * read: the ink and the wash are measured as for any accent, and the text on the fill is the neutral
 * end that reads best, or pure black or white when neither neutral reaches the minimum.
 */

export const accentTokenNames = ["accent", "accent-wash", "accent-ink", "on-accent"] as const;
type AccentToken = (typeof accentTokenNames)[number];
export type AccentPalette = Record<AccentToken, Oklch>;
export type AccentSeed = { hue: number; chroma: number; fixed?: { lightness: number } };
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
const MAX_FIXED_CHROMA = 0.37;

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

const PURE_WHITE: Oklch = { mode: "oklch", l: 1, c: 0 };
const PURE_BLACK: Oklch = { mode: "oklch", l: 0, c: 0 };

const betterOn = (fill: Oklch) => (a: Oklch, b: Oklch) =>
  wcagContrast(a, fill) >= wcagContrast(b, fill) ? a : b;

/** The better of the two neutrals when it reads at the minimum on the fill, else the best of all. */
function readableOn(fill: Oklch, candidates: readonly [Oklch, Oklch, ...Oklch[]]): Oklch {
  const pick = betterOn(fill);
  const neutral = pick(candidates[0], candidates[1]);
  return wcagContrast(neutral, fill) >= READABLE ? neutral : candidates.reduce(pick);
}

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
  const fill =
    seed.fixed === undefined
      ? make("accent")
      : toColor(seed.fixed.lightness * PERCENT, seed.chroma, seed.hue);
  const light = theme === "light" ? base.surface : base.ink;
  const dark = theme === "light" ? base.ink : base.background;
  const onAccent = readableOn(fill, [light, dark, PURE_WHITE, PURE_BLACK]);
  let palette: AccentPalette = {
    accent: fill,
    "accent-wash": make("accent-wash"),
    "accent-ink": make("accent-ink"),
    "on-accent": onAccent,
  };
  const inkPair: Pair = {
    foreground: "accent-ink",
    backgrounds: [...grounds, "accent-wash"],
    minimum: READABLE,
  };
  // A fixed fill is never moved, so only the generated colors around it are adjusted.
  const pairs: Pair[] =
    seed.fixed === undefined
      ? [
          { foreground: "accent", backgrounds: ["surface", "background"], minimum: NON_TEXT },
          // Moving the fill, not its text, keeps the text on every accent the same neutral.
          { foreground: "accent", backgrounds: ["on-accent"], minimum: READABLE },
          inkPair,
        ]
      : [inkPair];
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

function parseSeed(name: string, seed: Record<string, unknown>): AccentSeed {
  const { hue, chroma, fixed, lightness } = seed;
  if (typeof hue !== "number" || hue < 0 || hue >= 360) {
    throw new Error(`accents.${name}.hue must be a number from 0 up to 360`);
  }
  if (fixed === true) {
    if (typeof lightness !== "number" || lightness < 0.2 || lightness > 0.97) {
      throw new Error(`accents.${name}.lightness must be a number from 0.2 to 0.97 when fixed`);
    }
    if (typeof chroma !== "number" || chroma < 0 || chroma > MAX_FIXED_CHROMA) {
      throw new Error(`accents.${name}.chroma must be a number from 0 to ${MAX_FIXED_CHROMA}`);
    }
    return { hue, chroma, fixed: { lightness } };
  }
  if (fixed !== undefined || lightness !== undefined) {
    throw new Error(`accents.${name}: lightness belongs to a fixed accent, set "fixed": true`);
  }
  if (typeof chroma !== "number" || chroma < 0.04 || chroma > 0.2) {
    throw new Error(`accents.${name}.chroma must be a number from 0.04 to 0.2`);
  }
  return { hue, chroma };
}

export function parseAccents(value: unknown): Record<string, AccentSeed> {
  const accents = (value as { accents?: Record<string, Record<string, unknown>> } | null)?.accents;
  const result: Record<string, AccentSeed> = {};
  for (const [name, seed] of Object.entries(accents ?? {})) {
    if (!ACCENT_NAME.test(name) || name === "brand") {
      throw new Error(`accent name "${name}" must be lowercase words and cannot be "brand"`);
    }
    result[name] = parseSeed(name, seed);
  }
  return result;
}
