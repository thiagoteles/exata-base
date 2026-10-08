import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { generateTheme, parseSeeds } from "./tokens/generate";
import {
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

const seeds = parseSeeds(JSON.parse(readFileSync("colors.json", "utf8")));
const light = generateTheme("light", seeds);
const dark = generateTheme("dark", seeds);

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
  renderDesignTables(light.palette, dark.palette, [...light.report, ...dark.report]),
);

const outputs: ReadonlyArray<readonly [string, string]> = [
  ["styles/tokens.css", renderTokensCss(light.palette, dark.palette)],
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
