import { clampChroma, formatHex, type Oklch, wcagContrast } from "culori";
import type { Temperature } from "./preset-options";

/*
 * Builds the color tokens from two seeds. Each role has a fixed lightness per theme, is pulled
 * into sRGB, and is measured against the roles it sits on. A pair that falls short is fixed by
 * moving the foreground's lightness inside a limited range; if it still falls short the seeds
 * are refused and the pair is named, so a bad token is never written.
 */

export type Seeds = {
  brand: { hue: number; chroma: number };
  neutral: { offset: number };
};

export type Theme = "light" | "dark";

/** What the preset decides about color: how the neutrals are tinted and how hard they contrast. */
export type Look = { temperature: Temperature; contrast: "standard" | "reinforced" };

const DEFAULT_LOOK: Look = {
  temperature: { hue: "brand", chromaScale: 1 },
  contrast: "standard",
};
export type TokenName = (typeof tokenNames)[number];
export type Palette = Record<TokenName, Oklch>;
export type PairReport = {
  theme: Theme;
  foreground: TokenName;
  background: TokenName;
  ratio: number;
  minimum: number;
};

export const tokenNames = [
  "background",
  "surface",
  "sunken",
  "layer",
  "line",
  "line-strong",
  "ink",
  "ink-muted",
  "action",
  "on-action",
  "brand",
  "brand-wash",
  "brand-ink",
  "focus",
  "success",
  "success-wash",
  "success-ink",
  "warning",
  "warning-wash",
  "warning-ink",
  "danger",
  "danger-wash",
  "danger-ink",
] as const;

const SUCCESS_HUE = 150;
const WARNING_HUE = 85;
const DANGER_HUE = 25;
const SUCCESS_CLEARANCE = 25;
const FULL_TURN = 360;
const PERCENT = 100;
const MAX_ADJUSTMENT = 12;
const ADJUSTMENT_STEP = 0.5;
const DEFAULT_BRAND_CHROMA = 0.13;

const hueDistance = (a: number, b: number) => {
  const difference = Math.abs(a - b) % FULL_TURN;
  return Math.min(difference, FULL_TURN - difference);
};

/** Throws when the seeds cannot make a usable palette. Returns the seeds typed. */
export function parseSeeds(value: unknown): Seeds {
  const seeds = value as Partial<Seeds> | null;
  const hue = seeds?.brand?.hue;
  const chroma = seeds?.brand?.chroma;
  const offset = seeds?.neutral?.offset ?? 0;
  if (typeof hue !== "number" || hue < 0 || hue >= FULL_TURN) {
    throw new Error("brand.hue must be a number from 0 up to 360");
  }
  if (typeof chroma !== "number" || chroma < 0.04 || chroma > 0.2) {
    throw new Error("brand.chroma must be a number from 0.04 to 0.2");
  }
  if (typeof offset !== "number" || offset < 0 || offset > 30) {
    throw new Error("neutral.offset must be a number from 0 to 30");
  }
  if (hueDistance(hue, SUCCESS_HUE) < SUCCESS_CLEARANCE) {
    throw new Error(
      `brand.hue ${hue} is within ${SUCCESS_CLEARANCE} degrees of success (${SUCCESS_HUE}), so an action would look like a success`,
    );
  }
  return { brand: { hue, chroma }, neutral: { offset } };
}

type Source = "neutral" | "brand" | { hue: number };
type Spec = { l: number; c: number; source: Source };

type SpecName = Exclude<TokenName, "action" | "on-action" | "focus">;

const neutral = (l: number, c: number): Spec => ({ l, c, source: "neutral" });
/** `factor` multiplies the brand chroma seed. */
const brand = (l: number, factor: number): Spec => ({ l, c: factor, source: "brand" });
const fixed = (hue: number, l: number, c: number): Spec => ({ l, c, source: { hue } });

const lightSpecs: Record<SpecName, Spec> = {
  background: neutral(97.2, 0.006),
  surface: neutral(99.5, 0.003),
  sunken: neutral(94.5, 0.01),
  layer: neutral(99.5, 0.003),
  line: neutral(87, 0.012),
  "line-strong": neutral(56, 0.02),
  ink: neutral(23, 0.025),
  "ink-muted": neutral(45, 0.02),
  brand: brand(55, 1),
  "brand-wash": brand(94.5, 0.27),
  "brand-ink": brand(44, 0.9),
  success: fixed(SUCCESS_HUE, 46, 0.12),
  "success-wash": fixed(SUCCESS_HUE, 95, 0.035),
  "success-ink": fixed(SUCCESS_HUE, 40, 0.11),
  warning: fixed(WARNING_HUE, 70, 0.14),
  "warning-wash": fixed(WARNING_HUE, 95, 0.05),
  "warning-ink": fixed(WARNING_HUE, 45, 0.1),
  danger: fixed(DANGER_HUE, 54, 0.19),
  "danger-wash": fixed(DANGER_HUE, 95.5, 0.03),
  "danger-ink": fixed(DANGER_HUE, 48, 0.17),
};

/* The dark theme is not an inversion: surfaces rise in lightness with depth. */
const darkSpecs: Record<SpecName, Spec> = {
  background: neutral(16.5, 0.01),
  surface: neutral(20.5, 0.012),
  sunken: neutral(14.5, 0.01),
  layer: neutral(23.5, 0.012),
  line: neutral(31, 0.014),
  "line-strong": neutral(62, 0.02),
  ink: neutral(95, 0.006),
  "ink-muted": neutral(75, 0.015),
  brand: brand(74, 0.85),
  "brand-wash": brand(28, 0.3),
  "brand-ink": brand(80, 0.7),
  success: fixed(SUCCESS_HUE, 70, 0.13),
  "success-wash": fixed(SUCCESS_HUE, 26, 0.04),
  "success-ink": fixed(SUCCESS_HUE, 82, 0.1),
  warning: fixed(WARNING_HUE, 80, 0.13),
  "warning-wash": fixed(WARNING_HUE, 28, 0.045),
  "warning-ink": fixed(WARNING_HUE, 84, 0.11),
  danger: fixed(DANGER_HUE, 68, 0.17),
  "danger-wash": fixed(DANGER_HUE, 27, 0.05),
  "danger-ink": fixed(DANGER_HUE, 76, 0.13),
};

const specs = (theme: Theme) => (theme === "light" ? lightSpecs : darkSpecs);

type Constraint = { foreground: TokenName; backgrounds: readonly TokenName[]; minimum: number };

const TEXT = 7;
const READABLE = 4.5;
const NON_TEXT = 3;
const grounds = ["surface", "background", "sunken", "layer"] as const;

const constraintsFor = (contrast: Look["contrast"]): readonly Constraint[] => [
  { foreground: "ink", backgrounds: grounds, minimum: TEXT },
  {
    foreground: "ink-muted",
    backgrounds: grounds,
    minimum: contrast === "reinforced" ? TEXT : READABLE,
  },
  {
    foreground: "line-strong",
    backgrounds: ["surface", "background"],
    minimum: contrast === "reinforced" ? READABLE : NON_TEXT,
  },
  { foreground: "brand", backgrounds: ["surface", "background"], minimum: NON_TEXT },
  { foreground: "brand-ink", backgrounds: [...grounds, "brand-wash"], minimum: READABLE },
  { foreground: "success-ink", backgrounds: [...grounds, "success-wash"], minimum: READABLE },
  { foreground: "warning-ink", backgrounds: [...grounds, "warning-wash"], minimum: READABLE },
  { foreground: "danger-ink", backgrounds: [...grounds, "danger-wash"], minimum: READABLE },
];

const derived: readonly Constraint[] = [
  { foreground: "on-action", backgrounds: ["action"], minimum: READABLE },
  { foreground: "focus", backgrounds: ["surface", "background"], minimum: NON_TEXT },
];

const toColor = (l: number, c: number, h: number): Oklch =>
  clampChroma({ mode: "oklch", l: l / PERCENT, c, h }, "oklch") as Oklch;

function build(theme: Theme, seeds: Seeds, look: Look): Palette {
  const { hue, chromaScale } = look.temperature;
  const neutralHue = hue === "brand" ? (seeds.brand.hue + seeds.neutral.offset) % FULL_TURN : hue;
  const make = ([name, spec]: [string, Spec]): [string, Oklch] => {
    if (spec.source === "neutral") {
      return [name, toColor(spec.l, spec.c * chromaScale, neutralHue)];
    }
    if (spec.source === "brand") {
      return [name, toColor(spec.l, spec.c * seeds.brand.chroma, seeds.brand.hue)];
    }
    return [name, toColor(spec.l, spec.c, spec.source.hue)];
  };
  const base = Object.fromEntries(Object.entries(specs(theme)).map(make)) as Record<string, Oklch>;
  return {
    ...base,
    action: base["ink"] as Oklch,
    "on-action": theme === "light" ? (base["surface"] as Oklch) : (base["background"] as Oklch),
    focus: base["brand"] as Oklch,
  } as Palette;
}

const lightness = (color: Oklch) => color.l * PERCENT;

function worst(palette: Palette, constraint: Constraint): { background: TokenName; ratio: number } {
  const measured = constraint.backgrounds.map((background) => ({
    background,
    ratio: wcagContrast(palette[constraint.foreground], palette[background]),
  }));
  return measured.reduce((low, next) => (next.ratio < low.ratio ? next : low));
}

function adjust(theme: Theme, palette: Palette, constraint: Constraint): Palette {
  const direction = theme === "light" ? -1 : 1;
  const original = lightness(palette[constraint.foreground]);
  const color = palette[constraint.foreground];
  let offset = 0;
  let current = palette;
  while (worst(current, constraint).ratio < constraint.minimum && offset < MAX_ADJUSTMENT) {
    offset += ADJUSTMENT_STEP;
    const moved = toColor(original + direction * offset, color.c, color.h ?? 0);
    current = { ...palette, [constraint.foreground]: moved };
  }
  return current;
}

/** Measures every pair of one palette. */
export function measure(
  theme: Theme,
  palette: Palette,
  contrast: Look["contrast"] = "standard",
): PairReport[] {
  return [...constraintsFor(contrast), ...derived].flatMap((constraint) =>
    constraint.backgrounds.map((background) => ({
      theme,
      foreground: constraint.foreground,
      background,
      ratio: wcagContrast(palette[constraint.foreground], palette[background]),
      minimum: constraint.minimum,
    })),
  );
}

export function generateTheme(
  theme: Theme,
  seeds: Seeds,
  look: Look = DEFAULT_LOOK,
): { palette: Palette; report: PairReport[] } {
  let palette = build(theme, seeds, look);
  for (const constraint of constraintsFor(look.contrast)) {
    palette = adjust(theme, palette, constraint);
  }
  palette = { ...palette, action: palette.ink, focus: palette.brand };
  const report = measure(theme, palette, look.contrast);
  const failure = report.find((pair) => pair.ratio < pair.minimum);
  if (failure !== undefined) {
    throw new Error(
      `${failure.theme} theme: ${failure.foreground} on ${failure.background} is ${failure.ratio.toFixed(2)}:1 and needs ${failure.minimum}:1`,
    );
  }
  return { palette, report };
}

export const DEFAULT_SEEDS: Seeds = {
  brand: { hue: 245, chroma: DEFAULT_BRAND_CHROMA },
  neutral: { offset: 0 },
};

const round = (value: number, digits: number) => Number(value.toFixed(digits));

export function css(color: Oklch, alpha?: number): string {
  const body = `${round(lightness(color), 1)}% ${round(color.c, 3)} ${round(color.h ?? 0, 1)}`;
  return alpha === undefined ? `oklch(${body})` : `oklch(${body} / ${alpha})`;
}

export function hex(color: Oklch): string {
  return formatHex(color);
}
