import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { compareCatalogs } from "../lib/i18n/catalog-compare";
import { defaultLocale, locales } from "../lib/i18n/locales";

/*
 * Every language on the list must have a catalog with exactly the keys and arguments of the default
 * one. The root layout must also match the list: with several languages the page renders per
 * request, which the layout declares with `export const instant = false`; with one it declares nothing.
 */

const root = path.resolve(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");
const problems: string[] = [];

const base = JSON.parse(read(`messages/${defaultLocale}.json`)) as Record<string, never>;
for (const locale of locales.filter((candidate) => candidate !== defaultLocale)) {
  try {
    const other = JSON.parse(read(`messages/${locale}.json`)) as Record<string, never>;
    for (const problem of compareCatalogs(base, other)) {
      problems.push(`messages/${locale}.json: ${problem}`);
    }
  } catch {
    problems.push(
      `messages/${locale}.json: the language is on the list but the catalog is missing`,
    );
  }
}

const multilingual = locales.length > 1;
const optsOut = /^export const instant = false;?$/m.test(read("app/layout.tsx"));
if (multilingual && !optsOut) {
  problems.push(
    "app/layout.tsx: with more than one language add `export const instant = false;` (the language comes from the request, so the document renders per request)",
  );
}
if (!multilingual && optsOut) {
  problems.push(
    "app/layout.tsx: with one language remove `export const instant = false;` so the build keeps proving the shell is static",
  );
}

if (problems.length > 0) {
  process.stderr.write(`${problems.join("\n")}\n`);
  process.exit(1);
}
