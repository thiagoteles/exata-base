import {
  clampChroma,
  converter,
  differenceEuclidean,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
  type Oklch,
  wcagContrast,
} from "culori";
import type { Palette, Theme } from "./generate";

/*
 * Named palettes for a product's own categories (sectors, levels, kinds of record). A group is an
 * ordered list of colors, each a hue and a chroma with an optional lightness. Every color becomes
 * two tokens: the fill (`--color-<group>-<name>`, a mark that stays readable against the surface)
 * and its ink (`--color-<group>-<name>-ink`, text that reads at 4.5:1 on every ground).
 *
 * The group is then checked as a set, the way a chart palette is: neighbors in the declared order
 * must stay apart for a person with normal vision and under each kind of color blindness. A group
 * that fails is refused by name, so the fix is to move a hue or a lightness, never to ship it.
 */

const toOklab = converter("oklab");
const PERCENT = 100;
const NON_TEXT = 3;
const READABLE = 4.5;
const MAX_ADJUSTMENT = 30;
const STEP = 0.5;
/** Oklab distance times 100 between neighbors: the floor for normal vision, and for color blindness. */
const NORMAL_APART = 15;
const DEFICIENT_APART = 8;
const NAME = /^[a-z][a-z0-9-]*$/;
const GROUND_NAMES = ["surface", "background", "sunken", "layer"] as const;

type PaletteSeed = { hue: number; chroma: number; lightness?: number };
export type PaletteGroups = Record<string, Record<string, PaletteSeed>>;
export type PaletteColor = { group: string; name: string; fill: Oklch; ink: Oklch };
export type PaletteReport = {
  theme: Theme;
  group: string;
  between: [string, string];
  vision: "normal" | "protan" | "deutan" | "tritan";
  distance: number;
  minimum: number;
};

const fillStart: Record<Theme, number> = { light: 0.62, dark: 0.72 };
const inkStart: Record<Theme, { l: number; factor: number }> = {
  light: { l: 0.44, factor: 0.9 },
  dark: { l: 0.8, factor: 0.7 },
};

const toColor = (l: number, c: number, h: number): Oklch =>
  clampChroma({ mode: "oklch", l, c, h }, "oklch") as Oklch;

type Nudge = {
  theme: Theme;
  start: Oklch;
  grounds: readonly Oklch[];
  minimum: number;
  label: string;
};

/** Moves the lightness away from the grounds, a half point at a time, until the ratio holds. */
function nudged({ theme, start, grounds, minimum, label }: Nudge): Oklch {
  const direction = theme === "light" ? -1 : 1;
  const worst = (candidate: Oklch) =>
    Math.min(...grounds.map((ground) => wcagContrast(candidate, ground)));
  let color = start;
  for (let offset = 0; worst(color) < minimum; offset += STEP) {
    if (offset > MAX_ADJUSTMENT) {
      throw new Error(
        `${theme} theme, ${label}: no lightness reaches ${minimum}:1 on the grounds of this theme`,
      );
    }
    color = toColor(start.l + (direction * offset) / PERCENT, start.c, start.h ?? 0);
  }
  return color;
}

const seen = {
  protan: filterDeficiencyProt(1),
  deutan: filterDeficiencyDeuter(1),
  tritan: filterDeficiencyTrit(1),
} as const;
const distanceOf = differenceEuclidean("oklab");
const apart = (a: Oklch, b: Oklch, through: (value: Oklch) => Oklch = (value) => value) =>
  distanceOf(toOklab(through(a)), toOklab(through(b))) * PERCENT;

type Grounds = { fill: readonly Oklch[]; ink: readonly Oklch[] };

type Member = { theme: Theme; group: string; name: string; seed: PaletteSeed };

function makeColor({ theme, group, name, seed }: Member, grounds: Grounds): PaletteColor {
  const label = `${group}.${name}`;
  const fill = nudged({
    theme,
    start: toColor(seed.lightness ?? fillStart[theme], seed.chroma, seed.hue),
    grounds: grounds.fill,
    minimum: NON_TEXT,
    label: `${label} fill`,
  });
  const plan = inkStart[theme];
  const ink = nudged({
    theme,
    start: toColor(plan.l, plan.factor * seed.chroma, seed.hue),
    grounds: grounds.ink,
    minimum: READABLE,
    label: `${label} ink`,
  });
  return { group, name, fill, ink };
}

/** Measures each neighboring pair in the declared order and refuses the group that is too close. */
function neighborReport(theme: Theme, group: string, made: readonly PaletteColor[]) {
  const report: PaletteReport[] = [];
  for (const [index, current] of made.slice(0, -1).entries()) {
    const next = made[index + 1] as PaletteColor;
    const checks = [
      ["normal", NORMAL_APART, apart(current.fill, next.fill)],
      ["protan", DEFICIENT_APART, apart(current.fill, next.fill, seen.protan)],
      ["deutan", DEFICIENT_APART, apart(current.fill, next.fill, seen.deutan)],
      ["tritan", DEFICIENT_APART, apart(current.fill, next.fill, seen.tritan)],
    ] as const;
    for (const [vision, minimum, distance] of checks) {
      report.push({ theme, group, between: [current.name, next.name], vision, distance, minimum });
      if (distance < minimum) {
        throw new Error(
          `${theme} theme, palette ${group}: ${current.name} and ${next.name} are ${distance.toFixed(1)} apart for ${vision} vision and need ${minimum}; change a hue or a lightness`,
        );
      }
    }
  }
  return report;
}

export function generatePalettes(
  theme: Theme,
  groups: PaletteGroups,
  base: Palette,
): { colors: PaletteColor[]; report: PaletteReport[] } {
  const grounds: Grounds = {
    fill: [base.surface, base.background],
    ink: GROUND_NAMES.map((name) => base[name]),
  };
  const colors: PaletteColor[] = [];
  const report: PaletteReport[] = [];
  for (const [group, members] of Object.entries(groups)) {
    const made = Object.entries(members).map(([name, seed]) =>
      makeColor({ theme, group, name, seed }, grounds),
    );
    colors.push(...made);
    report.push(...neighborReport(theme, group, made));
  }
  return { colors, report };
}

function parseSeed(where: string, seed: Record<string, unknown>): PaletteSeed {
  const { hue, chroma, lightness } = seed;
  if (typeof hue !== "number" || hue < 0 || hue >= 360) {
    throw new Error(`${where}.hue must be a number from 0 up to 360`);
  }
  if (typeof chroma !== "number" || chroma < 0.03 || chroma > 0.3) {
    throw new Error(`${where}.chroma must be a number from 0.03 to 0.3`);
  }
  if (lightness === undefined) {
    return { hue, chroma };
  }
  if (typeof lightness !== "number" || lightness < 0.3 || lightness > 0.9) {
    throw new Error(`${where}.lightness must be a number from 0.3 to 0.9`);
  }
  return { hue, chroma, lightness };
}

export function parsePalettes(value: unknown): PaletteGroups {
  const groups = (
    value as { palettes?: Record<string, Record<string, Record<string, unknown>>> } | null
  )?.palettes;
  const result: PaletteGroups = {};
  for (const [group, members] of Object.entries(groups ?? {})) {
    if (!NAME.test(group)) {
      throw new Error(`palette group "${group}" must be lowercase words`);
    }
    const parsed: Record<string, PaletteSeed> = {};
    for (const [name, seed] of Object.entries(members)) {
      if (!NAME.test(name)) {
        throw new Error(`palettes.${group}.${name}: the name must be lowercase words`);
      }
      parsed[name] = parseSeed(`palettes.${group}.${name}`, seed);
    }
    result[group] = parsed;
  }
  return result;
}
