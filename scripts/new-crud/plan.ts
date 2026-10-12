/*
 * What a new area is made of, and how the shared registries learn about it. The base's living
 * sample (`sample-items`) is a real area: it compiles, its rules run against Postgres and its
 * screens in the browser suite. A copy of it is kept out of the app, as the template the generator
 * reads, so a product that removed the sample can still make areas. A test keeps the copy equal
 * to the living sample while the sample exists.
 */

export const TEMPLATE_ROOT = "scripts/new-crud/sample";

/** Every file of the sample area, by its path in the app. */
export const sampleFiles = [
  "lib/db/schema/sample-items.ts",
  "lib/sample-items/options.ts",
  "lib/sample-items/records.ts",
  "features/sample-items/actions.ts",
  "features/sample-items/delete-record.tsx",
  "features/sample-items/form.tsx",
  "features/sample-items/list.tsx",
  "features/sample-items/presentation.ts",
  "features/sample-items/record.tsx",
  "features/sample-items/schema.ts",
  "app/(app)/sample-items/page.tsx",
  "app/(app)/sample-items/new/page.tsx",
  "app/(app)/sample-items/[id]/page.tsx",
  "app/(app)/sample-items/[id]/edit/page.tsx",
  "messages/pt-BR/sampleItems.json",
  "tests/integration/sample-items.test.ts",
  "e2e/sample-items.spec.ts",
] as const;

/**
 * Where each shared registry learns about an area: the sample's own lines, which the generator
 * writes with the new names right after the anchor. JSON catalogs get a key instead.
 */
export const registrations = [
  {
    file: "lib/db/schema.ts",
    anchor: 'import { is } from "drizzle-orm";',
    lines: ['import { sampleItemStatus, sampleItems } from "./schema/sample-items";'],
  },
  {
    file: "lib/db/schema.ts",
    anchor: "export const schema = {",
    lines: ["  sampleItems,", "  sampleItemStatus,"],
  },
  {
    file: "lib/db/personal-data.ts",
    anchor: 'import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";',
    lines: ['import { sampleItems } from "./schema/sample-items";'],
  },
  {
    file: "lib/db/personal-data.ts",
    anchor: "export const exportedData: readonly Exported[] = [",
    lines: ['  { key: "sample_items", table: sampleItems, owner: sampleItems.ownerId },'],
  },
  {
    file: "lib/navigation.ts",
    anchor: "const navItems: readonly NavItem[] = [",
    lines: [
      '  { key: "sampleItems", href: "/sample-items", group: "main", minimum: "member", icon: "folder" },',
    ],
  },
] as const;

export const catalogKeys = [
  { file: "messages/pt-BR/nav.json", path: ["items", "sampleItems"], value: "Amostras" },
  {
    file: "messages/pt-BR/errors.json",
    path: ["sampleItemCodeTaken"],
    value: "Já existe um registro com esse código no seu cadastro.",
  },
] as const;

/** Writes the lines after the anchor. A line already there is not written twice. */
export function insertAfter(text: string, anchor: string, lines: readonly string[]): string {
  const at = text.indexOf(anchor);
  if (at === -1) {
    throw new Error(`the anchor is gone: ${anchor}`);
  }
  const missing = lines.filter((line) => !text.includes(line));
  if (missing.length === 0) {
    return text;
  }
  const end = at + anchor.length;
  return `${text.slice(0, end)}\n${missing.join("\n")}${text.slice(end)}`;
}

/** Takes lines out, for a product that no longer wants the sample. */
export const removeLines = (text: string, lines: readonly string[]): string =>
  text
    .split("\n")
    .filter((line) => !lines.includes(line))
    .join("\n");

type Json = { [key: string]: Json } | string;

/** Sets or removes one key of a catalog; the catalog is written back the way the base keeps it. */
export function setKey(json: string, path: readonly string[], value: string | null): string {
  const data = JSON.parse(json) as Record<string, Json>;
  let node = data;
  for (const key of path.slice(0, -1)) {
    node = node[key] as Record<string, Json>;
  }
  const last = path.at(-1) ?? "";
  if (value === null) {
    delete node[last];
  } else {
    node[last] = value;
  }
  return `${JSON.stringify(data, null, 2)}\n`;
}
