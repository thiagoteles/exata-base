import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { type Tree, withEntries } from "./extract-text/catalog";
import { extractText } from "./extract-text/extract";

/*
 * `pnpm extract-text <component> --area <area>` finds the sentences written inside a component and
 * moves them to `messages/pt-BR/<area>.json`, leaving `t("key")` behind. Without `--write` it only
 * reports what it would do. Read the keys it proposes before keeping them: a good key names the
 * sentence's job, and the first words of the sentence are only a start.
 */

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const areaAt = args.indexOf("--area");
const area = areaAt === -1 ? undefined : args[areaAt + 1];
const write = args.includes("--write");

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (file === undefined || area === undefined) {
  fail("Usage: pnpm extract-text <component file> --area <area> [--write]");
}
const catalogPath = path.join(root, "messages", "pt-BR", `${area}.json`);
const existing = existsSync(catalogPath)
  ? (JSON.parse(readFileSync(catalogPath, "utf8")) as Tree)
  : {};

const result = extractText(readFileSync(file, "utf8"), area, existing);
if (result.problems.length > 0) {
  fail(result.problems.join("\n"));
}
for (const [key, text] of result.entries) {
  process.stdout.write(`${area}.${key}  ${text}\n`);
}
if (write) {
  writeFileSync(file, result.source);
  writeFileSync(catalogPath, `${JSON.stringify(withEntries(existing, result.entries), null, 2)}\n`);
  process.stdout.write("Written. Run `pnpm messages` and `pnpm exec biome check --write`.\n");
} else {
  process.stdout.write(`${result.replaced} place(s) found. Add --write to apply.\n`);
}
