import fallbackMetrics from "next/dist/server/capsize-font-metrics.json" with { type: "json" };
import {
  type Choices,
  densities,
  type Elevation,
  elevations,
  type Face,
  knobs,
  motions,
  presets,
  shapes,
  type Temperature,
  temperatures,
  textSizes,
  typefaces,
} from "./preset-options";

/* What design.json resolves to, and the files the chosen knobs are written into. */

export type PresetName = keyof typeof presets;
export const presetNames = Object.keys(presets) as PresetName[];

export type Design = { preset: PresetName; choices: Choices };

/** Reads `preset` and `adjust` from design.json. Throws on any name that is not curated. */
export function parseDesign(value: unknown): Design {
  const input = (value ?? {}) as { preset?: unknown; adjust?: Record<string, unknown> };
  const preset = input.preset ?? "instrument";
  if (typeof preset !== "string" || !(preset in presets)) {
    throw new Error(`preset must be one of: ${presetNames.join(", ")}`);
  }
  const choices: Record<string, string> = { ...presets[preset as PresetName] };
  for (const [knob, option] of Object.entries(input.adjust ?? {})) {
    const options = (knobs as Record<string, readonly string[]>)[knob];
    if (options === undefined) {
      throw new Error(
        `adjust.${knob} is not a knob; the knobs are ${Object.keys(knobs).join(", ")}`,
      );
    }
    if (typeof option !== "string" || !options.includes(option)) {
      throw new Error(`adjust.${knob} must be one of: ${options.join(", ")}`);
    }
    choices[knob] = option;
  }
  return { preset: preset as PresetName, choices: choices as Choices };
}

export const temperatureOf = (choices: Choices): Temperature => temperatures[choices.temperature];
export const elevationOf = (choices: Choices): Elevation => elevations[choices.elevation];
export const isSerif = (choices: Choices): boolean => typefaces[choices.typeface].serif;

/** Every theme variable the chosen knobs set, in a fixed order so the output is stable. */
export function presetVariables(choices: Choices): [string, string][] {
  return Object.entries({
    ...typefaces[choices.typeface].vars,
    ...textSizes[choices.textSize],
    ...shapes[choices.shape],
    ...densities[choices.density],
    ...motions[choices.motion],
  });
}

/** The key next/font looks a family up by, in the table of fallback metrics it ships. */
const metricsKey = (loader: string) =>
  loader
    .replaceAll("_", " ")
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index: number) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase(),
    )
    .replace(/\s+/g, "");

/*
 * A face the table does not know gets no fallback adjustment: next/font would print "Failed to find
 * font override values" on every compile and hide the log that matters.
 */
export const hasFallbackMetrics = (loader: string): boolean =>
  Object.hasOwn(fallbackMetrics, metricsKey(loader));

/*
 * The file is in the repository, so a build never asks Google for it. next/font/local still wants
 * a literal path, which is why the module is written rather than configured.
 */
const call = (role: string, face: Face) => {
  const preload = face.options?.includes("preload: false") === true ? "\n  preload: false," : "";
  return `const ${role} = localFont({\n  src: "../assets/fonts/faces/${fontFile(face)}",\n  variable: "--font-face-${role}",\n  weight: "100 900",\n  display: "swap",\n  adjustFontFallback: false,${preload}\n});`;
};

/**
 * Every density, by name, as a scope any element can opt into with `data-density`. The same
 * variables the active preset sets, each at the value that density gives, so a catalog can show a
 * component at each density in one page and a test can ask the whole page for one. The active
 * preset's own density is unaffected: these rules only apply where the attribute is.
 */
function renderDensityScopes(): string {
  const base = new Map(baseTheme);
  const names = [...new Set(Object.values(densities).flatMap((vars) => Object.keys(vars)))];
  const scopes = Object.entries(densities).map(([density, vars]) => {
    const lines = names.map(
      (name) => `    ${name}: ${(vars as Record<string, string>)[name] ?? base.get(name) ?? ""};`,
    );
    return `  [data-density="${density}"] {\n${lines.join("\n")}\n  }`;
  });
  return `@layer base {\n${scopes.join("\n\n")}\n}\n`;
}

/*
 * The face every document is set in, whatever the preset: the PDFs embed it, so a document shown on
 * screen in the same face reads as the paper it becomes.
 */
const documentFace: Face = { loader: "Source_Serif_4", options: "preload: false" };

/*
 * next/font reads its calls at compile time: each must be a literal call assigned to a module
 * level const, with literal options. So the module is written, not configured. When titles use
 * the text face there is no heading call, and the CSS falls back to the text face.
 */
export function renderFonts(choices: Choices): string {
  const face = typefaces[choices.typeface];
  const roles = (["heading", "sans", "mono"] as const).filter(
    (role) => role !== "heading" || face.heading.loader !== face.sans.loader,
  );
  const variables = [...roles, "document"].map((role) => `${role}.variable`).join(", ");
  return `/*
 * The faces of the "${choices.typeface}" typeface. Generated by \`pnpm tokens\` from design.json: do
 * not edit by hand.
 */
import localFont from "next/font/local";

${roles.map((role) => call(role, face[role])).join("\n\n")}

// The face of the PDFs, for a document shown on screen. Not preloaded: only a sheet asks for it.
${call("document", documentFace)}

/** The class names that declare the font variables; the root element carries them. */
export const fontVariables = [${variables}].join(" ");
`;
}

export function describeChoices(preset: PresetName, choices: Choices): [string, string][] {
  return [
    ["Preset", preset],
    ["Typeface", `${choices.typeface}: ${typefaces[choices.typeface].label}`],
    ["Text size", choices.textSize],
    ["Shape", choices.shape],
    ["Density", choices.density],
    ["Elevation", choices.elevation],
    ["Motion", choices.motion],
    ["Neutral temperature", choices.temperature],
    ["Contrast", choices.contrast],
  ];
}

/* The instrument values, in the order the theme file lists them. Each knob replaces some of them. */
const baseTheme: [string, string][] = [
  ["--text-display", "clamp(2.5rem, 1.6rem + 3vw, 3.5rem)"],
  ["--text-display--line-height", "1.07"],
  ["--text-display--letter-spacing", "-0.032em"],
  ["--text-display--font-weight", "700"],
  ["--text-page-title", "2rem"],
  ["--text-page-title--line-height", "2.375rem"],
  ["--text-page-title--letter-spacing", "-0.022em"],
  ["--text-page-title--font-weight", "650"],
  ["--text-section", "1.375rem"],
  ["--text-section--line-height", "1.75rem"],
  ["--text-section--letter-spacing", "-0.012em"],
  ["--text-section--font-weight", "600"],
  ["--text-block-title", "1.125rem"],
  ["--text-block-title--line-height", "1.5rem"],
  ["--text-block-title--letter-spacing", "-0.005em"],
  ["--text-block-title--font-weight", "600"],
  ["--text-body", "1.0625rem"],
  ["--text-body--line-height", "1.625rem"],
  ["--text-body-small", "0.9375rem"],
  ["--text-body-small--line-height", "1.375rem"],
  ["--text-field-label", "0.9375rem"],
  ["--text-field-label--line-height", "1.25rem"],
  ["--text-field-label--font-weight", "550"],
  ["--text-label", "0.875rem"],
  ["--text-label--line-height", "1.125rem"],
  ["--text-label--font-weight", "500"],
  ["--text-button", "1rem"],
  ["--text-button--line-height", "1.25rem"],
  ["--text-button--font-weight", "600"],
  ["--text-figure", "2.25rem"],
  ["--text-figure--line-height", "2.75rem"],
  ["--text-figure--letter-spacing", "-0.03em"],
  ["--text-figure--font-weight", "500"],
  ["--text-data", "0.9375rem"],
  ["--text-data--line-height", "1.375rem"],
  ...Object.entries(shapes.standard),
  ["--radius-full", "9999px"],
  // The rounded data end of a chart bar; the same in every preset, as the chart method asks.
  ["--radius-mark", "4px"],
  ["--spacing-control", "2.75rem"],
  ["--spacing-control-coarse", "3rem"],
  ["--spacing-field", "3rem"],
  ["--spacing-row", "3.5rem"],
  ["--spacing-chip", "2.25rem"],
  ["--spacing-segment", "2.5rem"],
  ["--spacing-bar", "3.75rem"],
  ["--spacing-tab", "4rem"],
  ["--spacing-sidebar", "15.5rem"],
  ["--spacing-panel-inset", "1.5rem"],
  ["--spacing-dialog-inset", "1.75rem"],
  ["--spacing-cell-x", "1rem"],
  ["--spacing-cell-y", "0.75rem"],
  ["--container-dialog", "32.5rem"],
  ...Object.entries(motions.calm).filter(([name]) => name.startsWith("--animate-")),
  ["--animate-spin", "spin 800ms linear infinite"],
  ["--ease-enter", motions.calm["--ease-enter"]],
  ["--ease-exit", "cubic-bezier(0.4, 0, 1, 1)"],
  ["--ease-move", "cubic-bezier(0.4, 0, 0.2, 1)"],
];

/*
 * The whole theme except color, for the chosen knobs. Tailwind's own scales are cleared first, so
 * only these names exist; spacing and breakpoints keep Tailwind's defaults plus the named sizes.
 */
export function renderPresetCss(preset: PresetName, choices: Choices): string {
  const face = typefaces[choices.typeface];
  const headingFallback = face.serif
    ? "ui-serif, Georgia, serif"
    : "ui-sans-serif, system-ui, sans-serif";
  const overrides = new Map(presetVariables(choices));
  const lines = baseTheme.map(([name, value]) => `  ${name}: ${overrides.get(name) ?? value};`);
  return `/*
 * Type, shape, density and motion of the "${preset}" preset. Generated by \`pnpm tokens\` from
 * design.json: do not edit by hand.
 */

@theme {
  --font-*: initial;
  --text-*: initial;
  --radius-*: initial;
  --inset-shadow-*: initial;
  --drop-shadow-*: initial;
  --text-shadow-*: initial;
  --blur-*: initial;
  --animate-*: initial;
  --ease-*: initial;

  --font-heading:
    var(--font-face-heading, var(--font-face-sans)), ${headingFallback};
  --font-sans: var(--font-face-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-face-mono), ui-monospace, monospace;
  --font-document: var(--font-face-document), ui-serif, Georgia, serif;

${lines.join("\n")}
}

${renderDensityScopes()}`;
}

const familyOf = (face: Face) => face.loader.replaceAll("_", " ");

const fontFile = (face: Face) => `${familyOf(face).replaceAll(" ", "")}.ttf`;

/*
 * The families of the chosen typeface by name, for code that cannot use next/font, such as the
 * share image, which loads the font files itself.
 */
export function renderTypeface(choices: Choices): string {
  const face = typefaces[choices.typeface];
  return `/*
 * The families of the "${choices.typeface}" typeface. Generated by \`pnpm tokens\` from design.json:
 * do not edit by hand.
 */
export const typeface = {
  heading: "${familyOf(face.heading)}",
  text: "${familyOf(face.sans)}",
} as const;
`;
}

/**
 * Whether the active preset leaves anything for a person's choice of stronger contrast to move. A
 * preset that is already reinforced does not, and the account page then offers no such choice.
 */
export function renderContrastChoice(available: boolean): string {
  return `/*
 * Whether stronger contrast is a choice under the active preset. Generated by \`pnpm tokens\` from
 * design.json: do not edit by hand.
 */
export const strongerContrastAvailable: boolean = ${available};
`;
}
