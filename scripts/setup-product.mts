import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import {
  applyCatalog,
  applyDesign,
  applyPackage,
  applyReadme,
  type ProductInput,
  readCurrent,
  validateProduct,
} from "./setup-product/apply";
import { parseSeeds } from "./tokens/generate";

/*
 * `pnpm setup:product` fills in what a new product has to say about itself: its name, what it is
 * for, how it should sound, and its brand color. It asks, showing what is there now, and writes
 * the answers where they live. Run it again any time to correct a value. For a script or an agent,
 * pass the answers as flags and `--yes`; nothing is asked.
 */

const files = {
  catalog: "messages/pt-BR.json",
  manifest: "package.json",
  readme: "README.md",
  design: "DESIGN.md",
  colors: "colors.json",
} as const;

const { values: flags } = parseArgs({
  options: {
    name: { type: "string" },
    description: { type: "string" },
    audience: { type: "string" },
    tone: { type: "string" },
    surfaces: { type: "string" },
    hue: { type: "string" },
    chroma: { type: "string" },
    yes: { type: "boolean", default: false },
    "no-check": { type: "boolean", default: false },
  },
});

const read = (file: string) => readFileSync(file, "utf8");
const run = (command: string, args: string[]) => execFileSync(command, args, { stdio: "inherit" });

const colors = JSON.parse(read(files.colors)) as {
  brand: { hue: number; chroma: number };
  neutral: { offset: number };
};
const current = readCurrent(read(files.catalog), read(files.design));
const interactive = !flags.yes && process.stdin.isTTY === true;

async function ask(
  reader: ReturnType<typeof createInterface> | null,
  question: string,
  flag: string | undefined,
  fallback: string,
): Promise<string> {
  if (flag !== undefined) {
    return flag;
  }
  if (reader === null) {
    return fallback;
  }
  const shown = fallback === "" ? "" : ` [${fallback}]`;
  const answer = (await reader.question(`${question}${shown}: `)).trim();
  return answer === "" ? fallback : answer;
}

const prompt = interactive
  ? createInterface({ input: process.stdin, output: process.stdout })
  : null;
if (interactive) {
  process.stdout.write("Setting up the product. Press Enter to keep the value in brackets.\n\n");
}

const input: ProductInput = {
  name: await ask(prompt, "Product name", flags.name, current.name),
  description: await ask(
    prompt,
    "One sentence: what it does and for whom",
    flags.description,
    current.description,
  ),
  audience: await ask(prompt, "Who it is for", flags.audience, current.audience),
  tone: await ask(prompt, "Tone, three words on how it sounds and looks", flags.tone, current.tone),
  surfaces: await ask(
    prompt,
    "Surfaces it uses (public site, member area, staff area, admin)",
    flags.surfaces,
    current.surfaces,
  ),
};
const hue = Number(await ask(prompt, "Brand hue, 0 to 360", flags.hue, String(colors.brand.hue)));
const chroma = Number(
  await ask(prompt, "Brand chroma, 0.04 to 0.2", flags.chroma, String(colors.brand.chroma)),
);
prompt?.close();

const problems = validateProduct(input);
let seeds: ReturnType<typeof parseSeeds> | null = null;
try {
  seeds = parseSeeds({ brand: { hue, chroma }, neutral: colors.neutral });
} catch (error) {
  problems.push(error instanceof Error ? error.message : String(error));
}
if (problems.length > 0 || seeds === null) {
  process.stderr.write(`Nothing was written:\n${problems.map((line) => `- ${line}`).join("\n")}\n`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync(files.catalog, applyCatalog(read(files.catalog), input));
writeFileSync(files.manifest, applyPackage(read(files.manifest), input));
writeFileSync(files.readme, applyReadme(read(files.readme), input));
writeFileSync(files.design, applyDesign(read(files.design), input, today));
writeFileSync(
  files.colors,
  `${JSON.stringify({ brand: seeds.brand, neutral: seeds.neutral }, null, 2)}\n`,
);

// The palette, both themes, the e-mail colors and the DESIGN.md tables follow the seeds.
run("pnpm", ["tokens"]);
run("pnpm", ["exec", "biome", "format", "--write", ...Object.values(files)]);
if (!flags["no-check"]) {
  run("pnpm", ["check"]);
}

process.stdout.write(`
Done. Still yours to write:
- the home page copy (home.* in ${files.catalog}), still a placeholder
- the terms and privacy text (terms.*, privacy.*), written for a generic product
- production variables: see the README, section "Variables"
`);
