import { existsSync, readdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { locales } from "../lib/i18n/locales";
import { areaOf, joinAreas } from "./messages/join";

/*
 * `pnpm messages` joins `messages/<locale>/<area>.json` into `messages/<locale>.json`, the catalog the
 * app reads and the type of every text key. `--check` only compares, which is what `pnpm check` runs.
 * `--watch` joins again whenever an area file changes, so the development server sees the edit.
 */

const root = path.resolve(import.meta.dirname, "..");
const messages = path.join(root, "messages");
const [, , mode] = process.argv;

function joined(locale: string): string {
  const folder = path.join(messages, locale);
  if (!existsSync(folder)) {
    throw new Error(`messages/${locale}/ is missing: a language has one JSON file per area there`);
  }
  const areas: Record<string, unknown> = {};
  for (const file of readdirSync(folder)) {
    const area = areaOf(file);
    if (area === null) {
      throw new Error(
        `messages/${locale}/${file}: an area file is named after its area, like nav.json`,
      );
    }
    areas[area] = JSON.parse(readFileSync(path.join(folder, file), "utf8")) as unknown;
  }
  return joinAreas(areas);
}

const target = (locale: string) => path.join(messages, `${locale}.json`);
const current = (locale: string) => {
  try {
    return readFileSync(target(locale), "utf8");
  } catch {
    return "";
  }
};

function write() {
  for (const locale of locales) {
    const text = joined(locale);
    if (text !== current(locale)) {
      writeFileSync(target(locale), text);
      process.stdout.write(`wrote messages/${locale}.json\n`);
    }
  }
}

if (mode === "--check") {
  const stale = locales.filter((locale) => joined(locale) !== current(locale));
  if (stale.length > 0) {
    process.stderr.write(
      `The joined catalog is out of date with messages/<locale>/: ${stale.join(", ")}. Run \`pnpm messages\`.\n`,
    );
    process.exit(1);
  }
} else {
  write();
  if (mode === "--watch") {
    for (const locale of locales) {
      watch(path.join(messages, locale), () => {
        try {
          write();
        } catch (error) {
          process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        }
      });
    }
    process.stdout.write("watching messages/\n");
  }
}
