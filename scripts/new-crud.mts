import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { type AreaNames, renamer, SAMPLE_AREA, validateNames } from "./new-crud/names";
import {
  catalogKeys,
  insertAfter,
  registrations,
  removeLines,
  sampleFiles,
  setKey,
  TEMPLATE_ROOT,
} from "./new-crud/plan";

/*
 * `pnpm new:crud <area> --entity <Entity> --label <Rótulos>` makes a complete area from the base's
 * sample: table and migration, the rules with who sees what, the list, the record, the form to add
 * and change, the delete with confirmation, the pages, the text, the navigation entry, and the
 * tests that prove it. The first area a product makes takes the sample's place, unless
 * `--keep-sample`. `--remove-sample` takes the sample out alone; `--sync-sample` refreshes the
 * template from the living sample after it changed.
 *
 *   pnpm new:crud service-orders --entity ServiceOrder --label "Ordens de serviço"
 */

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    entity: { type: "string" },
    label: { type: "string" },
    "keep-sample": { type: "boolean", default: false },
    "remove-sample": { type: "boolean", default: false },
    "sync-sample": { type: "boolean", default: false },
  },
});

const read = (file: string) => readFileSync(file, "utf8");
const run = (command: string, args: string[]) => execFileSync(command, args, { stdio: "inherit" });
const sampleIsHere = () => existsSync(sampleFiles[0]);

function syncTemplate() {
  for (const file of sampleFiles) {
    const target = path.join(TEMPLATE_ROOT, file);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(file, target);
  }
  process.stdout.write(
    `The template now matches the living sample (${sampleFiles.length} files).\n`,
  );
}

function removeSample() {
  for (const file of sampleFiles) {
    rmSync(file, { force: true });
  }
  rmSync(path.join("app/(app)", SAMPLE_AREA), { recursive: true, force: true });
  rmSync(path.join("features", SAMPLE_AREA), { recursive: true, force: true });
  rmSync(path.join("lib", SAMPLE_AREA), { recursive: true, force: true });
  for (const { file, lines } of registrations) {
    writeFileSync(file, removeLines(read(file), lines));
  }
  for (const { file, path: keyPath } of catalogKeys) {
    writeFileSync(file, setKey(read(file), keyPath, null));
  }
}

function writeArea(names: AreaNames): string[] {
  const rename = renamer(names);
  for (const file of sampleFiles) {
    if (existsSync(rename(file))) {
      throw new Error(`${rename(file)} already exists; nothing was written`);
    }
  }
  const written = sampleFiles.map((file) => {
    const target = rename(file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, rename(read(path.join(TEMPLATE_ROOT, file))));
    return target;
  });
  for (const { file, anchor, lines } of registrations) {
    writeFileSync(file, insertAfter(read(file), anchor, lines.map(rename)));
  }
  for (const { file, path: keyPath, value } of catalogKeys) {
    const key = keyPath.map(rename);
    writeFileSync(
      file,
      setKey(read(file), key, key.at(-1) === keyPath.at(-1) ? value : rename(value)),
    );
  }
  return written;
}

const migrations = () => readdirSync("lib/db/migrations").filter((file) => file.endsWith(".sql"));

/**
 * Writes one migration and proves it was written: drizzle-kit answers a question it cannot ask
 * without a terminal by printing an error and leaving with success.
 */
function migrate(name: string) {
  const before = migrations().length;
  run("pnpm", ["db:generate", "--name", name]);
  if (migrations().length !== before + 1) {
    throw new Error(`drizzle-kit wrote no migration for ${name}; run pnpm db:generate yourself`);
  }
  // drizzle-kit leaves its snapshots unformatted, and the lint reads them.
  run("pnpm", ["exec", "biome", "format", "--write", "lib/db/migrations"]);
}

function tidy(files: string[]) {
  run("pnpm", ["messages"]);
  const touched = [...files, ...new Set(registrations.map(({ file }) => file))].filter(existsSync);
  run("pnpm", ["exec", "biome", "check", "--write", ...touched]);
}

if (values["sync-sample"]) {
  syncTemplate();
} else if (values["remove-sample"]) {
  removeSample();
  tidy([]);
  migrate("remove_sample_items");
} else {
  const names: AreaNames = {
    area: positionals[0] ?? "",
    entity: values.entity ?? "",
    label: values.label ?? "",
  };
  const problems = validateNames(names);
  if (problems.length > 0) {
    process.stderr.write(
      `Nothing was written:\n${problems.map((line) => `- ${line}`).join("\n")}\n`,
    );
    process.exit(1);
  }
  const files = writeArea(names);
  tidy(files);
  // The new area's migration is written while the sample is still there: with a table added and
  // another dropped in one step, drizzle-kit would ask whether one is the other renamed.
  migrate(names.area.replaceAll("-", "_"));
  if (!values["keep-sample"] && sampleIsHere()) {
    removeSample();
    tidy([]);
    migrate("remove_sample_items");
  }
  process.stdout.write(`
${names.area} is ready: ${files.length} files, the migration, the navigation entry and its text.
Still yours: the fields (the sample has name, code, status, due date and notes), the text in
messages/pt-BR/${renamer(names)("sampleItems")}.json, and \`pnpm db:migrate\` to apply the migration.
`);
}
