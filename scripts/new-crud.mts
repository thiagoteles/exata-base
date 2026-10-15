import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import {
  type AreaNames,
  camelArea,
  childRenamer,
  renamer,
  SAMPLE_AREA,
  SAMPLE_CHILD_AREA,
  validateNames,
} from "./new-crud/names";
import {
  asTemplate,
  catalogKeys,
  childCatalogKeys,
  childFiles,
  childNavigation,
  childRegistrations,
  insertAfter,
  insertBefore,
  navAnchor,
  parentPage,
  register,
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
 * `--parent <area>` makes a child area instead: every record is filed under one of the account's
 * records of that area, the database refuses one of another account, the parent cannot be deleted
 * while it has children, and the parent's page lists them with the way to add another.
 *
 *   pnpm new:crud service-orders --entity ServiceOrder --label "Ordens de serviço"
 *   pnpm new:crud pets --entity Pet --label "Animais" --parent people
 */

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    entity: { type: "string" },
    label: { type: "string" },
    parent: { type: "string" },
    "keep-sample": { type: "boolean", default: false },
    "remove-sample": { type: "boolean", default: false },
    "sync-sample": { type: "boolean", default: false },
  },
});

const read = (file: string) => readFileSync(file, "utf8");
const run = (command: string, args: string[]) => execFileSync(command, args, { stdio: "inherit" });
const sampleIsHere = () => existsSync(sampleFiles[0]);

function syncTemplate() {
  const files = [...sampleFiles, ...childFiles];
  for (const file of files) {
    const target = path.join(TEMPLATE_ROOT, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, asTemplate(file, read(file)));
  }
  process.stdout.write(`The template now matches the living samples (${files.length} files).\n`);
}

/** Takes out both samples, the child with its parent: its table points at the parent's. */
function removeSample() {
  for (const file of [...sampleFiles, ...childFiles]) {
    rmSync(file, { force: true });
  }
  for (const area of [SAMPLE_AREA, SAMPLE_CHILD_AREA]) {
    rmSync(path.join("app/(app)", area), { recursive: true, force: true });
    rmSync(path.join("features", area), { recursive: true, force: true });
    rmSync(path.join("lib", area), { recursive: true, force: true });
  }
  for (const { file, lines } of [
    ...registrations,
    ...childRegistrations,
    { file: childNavigation.file, lines: [childNavigation.line] },
  ]) {
    writeFileSync(file, removeLines(read(file), lines));
  }
  for (const { file, path: keyPath } of [...catalogKeys, ...childCatalogKeys]) {
    if (existsSync(file)) {
      writeFileSync(file, setKey(read(file), keyPath, null));
    }
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
  for (const entry of registrations) {
    writeFileSync(entry.file, register(read(entry.file), entry, entry.lines.map(rename)));
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

const rowType = /export type (\w+)Row = /;
const nameColumn = /^\s+name: text\(\)/m;

/**
 * The names of an area the product already has, read from its own files: the entity from its rules
 * (`export type PersonRow`) and the label from the navigation. The child's rules read the parent's
 * `name`, and its key points at the parent's unique `(owner_id, id)`, so both must be there.
 */
function parentNames(area: string): { names: AreaNames; problems: string[] } {
  const schemaFile = `lib/db/schema/${area}.ts`;
  const rulesFile = `lib/${area}/records.ts`;
  if (!(existsSync(schemaFile) && existsSync(rulesFile))) {
    return {
      names: { area, entity: "", label: "" },
      problems: [`the parent ${area} is not an area of this product (${schemaFile}, ${rulesFile})`],
    };
  }
  const schema = read(schemaFile);
  const entity = rowType.exec(read(rulesFile))?.[1] ?? "";
  const nav = JSON.parse(read("messages/pt-BR/nav.product.json")) as {
    items?: Record<string, string>;
  };
  const label = nav.items?.[camelArea(area)] ?? "";
  const problems: string[] = [];
  if (entity === "") {
    problems.push(
      `${rulesFile} has no \`export type <Entity>Row\`, which names the parent's entity`,
    );
  }
  if (label === "") {
    problems.push(
      `messages/pt-BR/nav.product.json has no items.${camelArea(area)}, the parent's label`,
    );
  }
  if (!nameColumn.test(schema)) {
    problems.push(
      `${schemaFile} has no name column; the child shows and searches the parent by it`,
    );
  }
  if (!schema.includes("on(table.ownerId, table.id)")) {
    problems.push(
      `${schemaFile} has no unique (owner_id, id) for the child's key to point at: add ` +
        `\`unique("<table>_owner_id").on(table.ownerId, table.id)\` to it, run ` +
        "`pnpm db:generate`, and make the child after; one migration with both, Postgres refuses",
    );
  }
  if (area === SAMPLE_AREA || area === SAMPLE_CHILD_AREA) {
    problems.push("the parent is one of the base's samples, which the first real area removes");
  }
  return { names: { area, entity, label }, problems };
}

/** Writes the child area, its registry lines, its entry below the parent's, and the parent's section. */
function writeChild(names: AreaNames, parent: AreaNames): { files: string[]; manual: string[] } {
  const rename = childRenamer(names, parent);
  const asParent = renamer(parent);
  for (const file of childFiles) {
    if (existsSync(rename(file))) {
      throw new Error(`${rename(file)} already exists; nothing was written`);
    }
  }
  const files = childFiles.map((file) => {
    const target = rename(file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, rename(read(path.join(TEMPLATE_ROOT, file))));
    return target;
  });
  for (const entry of childRegistrations) {
    writeFileSync(entry.file, register(read(entry.file), entry, entry.lines.map(rename)));
  }
  // Right below the parent's entry, found by its key so a changed icon or role still finds it.
  // A long entry is formatted over several lines, so the child goes after the line that closes it.
  const navigation = read(childNavigation.file).split("\n");
  const start = navigation.findIndex((line) => line.includes(`key: "${camelArea(parent.area)}",`));
  const below =
    start === -1
      ? -1
      : navigation.findIndex((line, at) => at >= start && line.trimEnd().endsWith("},"));
  if (below === -1) {
    writeFileSync(
      childNavigation.file,
      insertAfter(read(childNavigation.file), navAnchor, [rename(childNavigation.line)]),
    );
  } else {
    navigation.splice(below + 1, 0, rename(childNavigation.line));
    writeFileSync(childNavigation.file, navigation.join("\n"));
  }
  for (const { file, path: keyPath, value } of childCatalogKeys) {
    const key = keyPath.map(rename);
    writeFileSync(
      file,
      setKey(read(file), key, key.at(-1) === keyPath.at(-1) ? value : rename(value)),
    );
  }
  // The parent's page may have changed since it was made; what cannot be placed is said, not guessed.
  const page = asParent(parentPage.file);
  const manual: string[] = [];
  let text = existsSync(page) ? read(page) : "";
  const importAnchor = asParent(parentPage.importAnchor);
  const sectionAnchor = asParent(parentPage.sectionAnchor);
  if (text.includes(importAnchor) && text.includes(sectionAnchor)) {
    text = insertAfter(text, importAnchor, [rename(parentPage.importLine)]);
    text = insertBefore(text, sectionAnchor, [rename(parentPage.sectionLine)]);
    writeFileSync(page, text);
    files.push(page);
  } else {
    manual.push(
      `${page}: import and render the children where the record is shown:`,
      `  ${rename(parentPage.importLine)}`,
      `  ${rename(parentPage.sectionLine).trim()}`,
    );
  }
  return { files, manual };
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
} else if (values.parent === undefined) {
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
Change the fields in two migrations, first adding and then removing, so drizzle-kit asks nothing;
a child of another area has its recipe in the new-crud skill.
`);
} else {
  const names: AreaNames = {
    area: positionals[0] ?? "",
    entity: values.entity ?? "",
    label: values.label ?? "",
  };
  const parent = parentNames(values.parent);
  const problems = [
    ...validateNames(names),
    ...parent.problems,
    ...(names.area === values.parent ? ["an area cannot be its own parent"] : []),
  ];
  if (problems.length > 0) {
    process.stderr.write(
      `Nothing was written:\n${problems.map((line) => `- ${line}`).join("\n")}\n`,
    );
    process.exit(1);
  }
  const { files, manual } = writeChild(names, parent.names);
  tidy(files);
  migrate(names.area.replaceAll("-", "_"));
  process.stdout.write(`
${names.area} is ready, filed under ${values.parent}: ${files.length} files, the migration, the
navigation entry below ${values.parent}'s and its text. ${values.parent}'s page lists them, and a record of
${values.parent} with ${names.area} filed under it cannot be deleted.
${manual.length > 0 ? `\nStill to place by hand:\n${manual.join("\n")}\n` : ""}
Still yours: the fields, the text in messages/pt-BR/${camelArea(names.area)}.json (the field that
names the parent reads "Registro de ${parent.names.label.toLowerCase()}"), and \`pnpm db:migrate\`.
`);
}
