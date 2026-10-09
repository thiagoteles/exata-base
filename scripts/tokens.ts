import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { generateAccent, parseAccents } from "./tokens/accent";
import { generateTheme, parseSeeds } from "./tokens/generate";
import {
  describeChoices,
  elevationOf,
  parseDesign,
  presetVariables,
  renderFonts,
  renderPresetCss,
  temperatureOf,
} from "./tokens/preset";
import {
  type RenderedAccent,
  renderAccentNames,
  renderDesignTables,
  renderEmailPalette,
  renderFrontmatterColors,
  renderPresetTables,
  renderTokensCss,
  replaceBetween,
} from "./tokens/render";

/*
 * `pnpm tokens` regenerates every file that follows design.json: colors for both themes, the
 * preset's type, shape, density and motion, the font module, the e-mail palette, the accent names
 * and the generated parts of DESIGN.md. `--check` only compares, and fails when a file is out of
 * date, which is what `pnpm check` runs.
 */

const checkOnly = process.argv.includes("--check");

const input: unknown = JSON.parse(readFileSync("design.json", "utf8"));
const seeds = parseSeeds(input);
const { preset, choices } = parseDesign(input);
const look = { temperature: temperatureOf(choices), contrast: choices.contrast };
const light = generateTheme("light", seeds, look);
const dark = generateTheme("dark", seeds, look);

const accentSeeds = Object.entries({ brand: seeds.brand, ...parseAccents(input) });
const generated = accentSeeds.map(([name, seed]) => ({
  name,
  light: generateAccent("light", name, seed, light.palette),
  dark: generateAccent("dark", name, seed, dark.palette),
}));
const [brand, ...others] = generated.map(
  (a): RenderedAccent => ({ name: a.name, light: a.light.palette, dark: a.dark.palette }),
);
if (brand === undefined) {
  throw new Error("the brand accent is always generated");
}
const accents: [RenderedAccent, ...RenderedAccent[]] = [brand, ...others];
const accentReport = generated.flatMap((a) => [...a.light.report, ...a.dark.report]);

const design = [
  (text: string) =>
    replaceBetween(
      text,
      "  # tokens:start",
      "  # tokens:end",
      renderFrontmatterColors(light.palette),
    ),
  (text: string) =>
    replaceBetween(
      text,
      "<!-- tokens:start -->",
      "<!-- tokens:end -->",
      renderDesignTables(
        { light: light.palette, dark: dark.palette, report: [...light.report, ...dark.report] },
        { accents, report: accentReport },
      ),
    ),
  (text: string) =>
    replaceBetween(
      text,
      "<!-- preset:start -->",
      "<!-- preset:end -->",
      renderPresetTables(describeChoices(preset, choices), presetVariables(choices)),
    ),
].reduce((text, step) => step(text), readFileSync("DESIGN.md", "utf8"));

const outputs: ReadonlyArray<readonly [string, string]> = [
  [
    "styles/tokens.css",
    renderTokensCss(light.palette, dark.palette, accents, elevationOf(choices)),
  ],
  ["styles/preset.css", renderPresetCss(preset, choices)],
  ["app/fonts.ts", renderFonts(choices)],
  ["lib/accents.ts", renderAccentNames(accents.map((a) => a.name))],
  ["emails/palette.ts", renderEmailPalette(light.palette)],
  ["DESIGN.md", design],
];

const contentOf = (file: string) => {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
};
const stale = outputs.filter(([file, content]) => contentOf(file) !== content);

if (checkOnly) {
  if (stale.length > 0) {
    process.stderr.write(
      `Out of date with design.json: ${stale.map(([file]) => file).join(", ")}. Run \`pnpm tokens\`.\n`,
    );
    process.exit(1);
  }
} else {
  for (const [file, content] of stale) {
    writeFileSync(file, content);
    process.stdout.write(`wrote ${file}\n`);
  }
}
