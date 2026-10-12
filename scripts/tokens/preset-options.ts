/*
 * A preset is one curated choice per knob. The product picks a preset in design.json and may swap
 * single knobs under `adjust`, always for another curated option, never a free value: that keeps
 * every product distinct without letting any of them drift outside what the checks measure.
 */

type Vars = Readonly<Record<string, string>>;

export type Face = { loader: string; options?: string };
type Typeface = {
  label: string;
  heading: Face;
  sans: Face;
  mono: Face;
  /** Whether the heading face has serifs; the token check allows `font-serif` only then. */
  serif: boolean;
  vars: Vars;
};

export const typefaces = {
  instrument: {
    label: "Onest for text, JetBrains Mono for numbers",
    heading: { loader: "Onest" },
    sans: { loader: "Onest" },
    mono: { loader: "JetBrains_Mono" },
    serif: false,
    vars: {},
  },
  editorial: {
    label: "Newsreader for titles, Public Sans for text, IBM Plex Mono for numbers",
    heading: { loader: "Newsreader", options: 'axes: ["opsz"]' },
    sans: { loader: "Public_Sans" },
    mono: { loader: "IBM_Plex_Mono", options: 'weight: ["400", "500"]' },
    serif: true,
    vars: {
      "--text-body": "1.125rem",
      "--text-body--line-height": "1.8rem",
      "--text-page-title": "2.375rem",
      "--text-page-title--line-height": "2.75rem",
      "--text-page-title--letter-spacing": "-0.01em",
      "--text-page-title--font-weight": "500",
      "--text-section": "1.625rem",
      "--text-section--line-height": "2rem",
      "--text-section--letter-spacing": "-0.005em",
      "--text-section--font-weight": "500",
    },
  },
  hyperlegible: {
    label: "Atkinson Hyperlegible Next for text, Atkinson Hyperlegible Mono for numbers",
    heading: { loader: "Atkinson_Hyperlegible_Next" },
    sans: { loader: "Atkinson_Hyperlegible_Next" },
    mono: { loader: "Atkinson_Hyperlegible_Mono" },
    serif: false,
    vars: {},
  },
  expressive: {
    label: "Bricolage Grotesque for titles, Figtree for text, Geist Mono for numbers",
    heading: { loader: "Bricolage_Grotesque" },
    sans: { loader: "Figtree" },
    mono: { loader: "Geist_Mono" },
    serif: false,
    vars: {
      "--text-page-title": "2.25rem",
      "--text-page-title--line-height": "2.5rem",
      "--text-page-title--letter-spacing": "-0.03em",
      "--text-page-title--font-weight": "750",
      "--text-section": "1.5rem",
      "--text-section--letter-spacing": "-0.02em",
      "--text-section--font-weight": "700",
    },
  },
} satisfies Record<string, Typeface>;

export const textSizes = {
  standard: {},
  large: {
    "--text-body": "1.125rem",
    "--text-body--line-height": "1.75rem",
    "--text-body-small": "1rem",
    "--text-body-small--line-height": "1.5rem",
    "--text-field-label": "1rem",
    "--text-field-label--line-height": "1.375rem",
    "--text-field-label--font-weight": "600",
    "--text-label": "0.9375rem",
    "--text-label--line-height": "1.25rem",
    "--text-button": "1.0625rem",
    "--text-data": "1rem",
    "--text-data--line-height": "1.5rem",
  },
} satisfies Record<string, Vars>;

/** Stamp, control, cell, panel and dialog radii, smallest first. */
const radii = ([stamp, control, cell, panel, dialog]: readonly [
  string,
  string,
  string,
  string,
  string,
]) => ({
  "--radius-stamp": stamp,
  "--radius-control": control,
  "--radius-cell": cell,
  "--radius-panel": panel,
  "--radius-dialog": dialog,
});

/** `round` is the only shape where a stamp is a pill. */
export const shapes = {
  tight: radii(["3px", "8px", "8px", "12px", "16px"]),
  standard: radii(["4px", "10px", "10px", "14px", "18px"]),
  rounded: radii(["6px", "12px", "12px", "16px", "20px"]),
  round: radii(["9999px", "16px", "14px", "24px", "28px"]),
} satisfies Record<string, Vars>;

export const densities = {
  medium: {},
  comfortable: {
    "--spacing-control": "3rem",
    "--spacing-control-coarse": "3.25rem",
    "--spacing-field": "3.25rem",
    "--spacing-row": "4rem",
    "--spacing-panel-inset": "2rem",
    "--spacing-dialog-inset": "2rem",
    "--spacing-cell-x": "1.25rem",
    "--spacing-cell-y": "1rem",
    "--spacing-sidebar": "17rem",
  },
  large: {
    "--spacing-control": "3.25rem",
    "--spacing-control-coarse": "3.5rem",
    "--spacing-field": "3.5rem",
    "--spacing-row": "4rem",
    "--spacing-chip": "2.75rem",
    "--spacing-segment": "3rem",
    "--spacing-sidebar": "17rem",
  },
} satisfies Record<string, Vars>;

/** The light shadow of the floating layer; in the dark theme every option is a 1px outline. */
export type Elevation = {
  offset: string;
  blur: string;
  spread: string;
  opacity: number;
  rim: string;
};

export const elevations = {
  shadow: { rim: "0 1px 0", offset: "16px", blur: "40px", spread: "-16px", opacity: 0.28 },
  hairline: { rim: "0 0 0 1px", offset: "10px", blur: "28px", spread: "-20px", opacity: 0.25 },
  deep: { rim: "0 2px 0", offset: "28px", blur: "56px", spread: "-24px", opacity: 0.38 },
} satisfies Record<string, Elevation>;

const animations = (fade: number, layer: number, bar: number, stamp: number) => {
  const exit = (ms: number) => Math.round(ms * 0.7);
  return {
    "--animate-fade-in": `fade-in ${fade}ms var(--ease-enter) both`,
    "--animate-fade-out": `fade-out ${exit(fade)}ms var(--ease-exit) both`,
    "--animate-layer-in": `layer-in ${layer}ms var(--ease-enter) both`,
    "--animate-layer-out": `layer-out ${exit(layer)}ms var(--ease-exit) both`,
    "--animate-sheet-in": `sheet-in ${layer}ms var(--ease-enter) both`,
    "--animate-sheet-out": `sheet-out ${exit(layer)}ms var(--ease-exit) both`,
    "--animate-bar-in": `bar-in ${bar}ms var(--ease-enter) both`,
    "--animate-stamp": `stamp ${stamp}ms var(--ease-enter) both`,
  };
};

export const motions = {
  calm: { "--ease-enter": "cubic-bezier(0.2, 0.8, 0.2, 1)", ...animations(200, 280, 200, 120) },
  minimal: { "--ease-enter": "cubic-bezier(0.2, 0.8, 0.2, 1)", ...animations(140, 200, 140, 120) },
  lively: { "--ease-enter": "cubic-bezier(0.34, 1.3, 0.64, 1)", ...animations(200, 340, 240, 220) },
} satisfies Record<string, Vars>;

/** How the neutrals are tinted: the brand hue, or a fixed warm paper, and how much chroma. */
export type Temperature = { hue: "brand" | number; chromaScale: number };

export const temperatures = {
  cool: { hue: "brand", chromaScale: 1 },
  warm: { hue: 75, chromaScale: 1.8 },
  tinted: { hue: "brand", chromaScale: 1.6 },
} satisfies Record<string, Temperature>;

/** `reinforced` raises muted text to 7:1 and control borders to 4.5:1. */
const contrasts = ["standard", "reinforced"] as const;

export const knobs = {
  typeface: Object.keys(typefaces),
  textSize: Object.keys(textSizes),
  shape: Object.keys(shapes),
  density: Object.keys(densities),
  elevation: Object.keys(elevations),
  motion: Object.keys(motions),
  temperature: Object.keys(temperatures),
  contrast: contrasts,
} as const;

export type Choices = {
  typeface: keyof typeof typefaces;
  textSize: keyof typeof textSizes;
  shape: keyof typeof shapes;
  density: keyof typeof densities;
  elevation: keyof typeof elevations;
  motion: keyof typeof motions;
  temperature: keyof typeof temperatures;
  contrast: (typeof contrasts)[number];
};

export const presets = {
  instrument: {
    typeface: "instrument",
    textSize: "standard",
    shape: "standard",
    density: "medium",
    elevation: "shadow",
    motion: "calm",
    temperature: "cool",
    contrast: "standard",
  },
  editorial: {
    typeface: "editorial",
    textSize: "standard",
    shape: "tight",
    density: "comfortable",
    elevation: "hairline",
    motion: "calm",
    temperature: "warm",
    contrast: "standard",
  },
  accessible: {
    typeface: "hyperlegible",
    textSize: "large",
    shape: "rounded",
    density: "large",
    elevation: "shadow",
    motion: "minimal",
    temperature: "cool",
    contrast: "reinforced",
  },
  vivid: {
    typeface: "expressive",
    textSize: "standard",
    shape: "round",
    density: "medium",
    elevation: "deep",
    motion: "lively",
    temperature: "tinted",
    contrast: "standard",
  },
} as const satisfies Record<string, Choices>;
