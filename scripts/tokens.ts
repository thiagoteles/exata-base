import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { generateAccent, parseAccents } from "./tokens/accent";
import { generateTheme, parseSeeds } from "./tokens/generate";
import {
  type RenderedAccent,
  renderAccentNames,
  renderDesignTables,
  renderEmailPalette,
  renderFrontmatterColors,
  renderTokensCss,
  replaceBetween,
} from "./tokens/render";

/*
 * `pnpm tokens` regenerates every file that holds a color from colors.json. `--check` only
 * compares, and fails when a file is out of date, which is what `pnpm check` runs.
 */

const checkOnly = process.argv.includes("--check");

const input: unknown = JSON.parse(readFileSync("colors.json", "utf8"));
const seeds = parseSeeds(input);
const light = generateTheme("light", seeds);
const dark = generateTheme("dark", seeds);

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

const design = readFileSync("DESIGN.md", "utf8");
const withFrontmatter = replaceBetween(
  design,
  "  # tokens:start",
  "  # tokens:end",
  renderFrontmatterColors(light.palette),
);
const withTables = replaceBetween(
  withFrontmatter,
  "<!-- tokens:start -->",
  "<!-- tokens:end -->",
  renderDesignTables(
    { light: light.palette, dark: dark.palette, report: [...light.report, ...dark.report] },
    { accents, report: accentReport },
  ),
);

const outputs: ReadonlyArray<readonly [string, string]> = [
  ["styles/tokens.css", renderTokensCss(light.palette, dark.palette, accents)],
  ["lib/accents.ts", renderAccentNames(accents.map((a) => a.name))],
  ["emails/palette.ts", renderEmailPalette(light.palette)],
  ["DESIGN.md", withTables],
];

const stale = outputs.filter(([file, content]) => readFileSync(file, "utf8") !== content);

if (checkOnly) {
  if (stale.length > 0) {
    process.stderr.write(
      `Out of date with colors.json: ${stale.map(([file]) => file).join(", ")}. Run \`pnpm tokens\`.\n`,
    );
    process.exit(1);
  }
} else {
  for (const [file, content] of stale) {
    writeFileSync(file, content);
    process.stdout.write(`wrote ${file}\n`);
  }
}
