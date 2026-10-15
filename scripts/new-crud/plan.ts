/*
 * What a new area is made of, and how the shared registries learn about it. The base's living
 * sample (`sample-items`) is a real area: it compiles, its rules run against Postgres and its
 * screens in the browser suite. A copy of it is kept out of the app, as the template the generator
 * reads, so a product that removed the sample can still make areas. A test keeps the copy equal
 * to the living sample while the sample exists. A second sample, `sample-parts`, is filed under the
 * first and is the template of a child area (`--parent`).
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

/** The comment that opens the product's schema file: an area's import is written right above it. */
const schemaImportAnchor = "/*\n * The product's own tables and enums";

/** The opening of the product's destinations, where an area's entry is written. */
export const navAnchor = "export const productNavItems = [";

/**
 * Where each of the product's registries learns about an area: the sample's own lines, which the
 * generator writes with the new names right after the anchor (or right before it, for an import
 * that goes above a comment). JSON catalogs get a key in the product's overlay instead. Every file
 * named here is the product's own, so an area never touches a file of the base.
 */
export const registrations = [
  {
    file: "lib/db/schema.product.ts",
    anchor: schemaImportAnchor,
    before: true,
    lines: ['import { sampleItemStatus, sampleItems } from "./schema/sample-items";'],
  },
  {
    file: "lib/db/schema.product.ts",
    anchor: "export const productSchema = {",
    lines: ["  sampleItems,", "  sampleItemStatus,"],
  },
  {
    file: "lib/db/personal-data.product.ts",
    anchor: 'import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";',
    lines: ['import { sampleItems } from "./schema/sample-items";'],
  },
  {
    file: "lib/db/personal-data.product.ts",
    anchor: "export const productExportedData: readonly Exported[] = [",
    lines: ['  { key: "sample_items", table: sampleItems, owner: sampleItems.ownerId },'],
  },
  {
    file: "lib/navigation.product.ts",
    anchor: navAnchor,
    lines: [
      '  { key: "sampleItems", href: "/sample-items", group: "main", minimum: "member", icon: "folder" },',
    ],
  },
] as const;

const inUse = "Ainda há outros registros ligados a este. Exclua ou mova esses registros antes.";

export const catalogKeys = [
  { file: "messages/pt-BR/nav.product.json", path: ["items", "sampleItems"], value: "Amostras" },
  {
    file: "messages/pt-BR/errors.product.json",
    path: ["sampleItemCodeTaken"],
    value: "Já existe um registro com esse código no seu cadastro.",
  },
  { file: "messages/pt-BR/errors.product.json", path: ["sampleItemHasLinks"], value: inUse },
] as const;

/** Every file of the child sample, by its path in the app. */
export const childFiles = [
  "lib/db/schema/sample-parts.ts",
  "lib/sample-parts/options.ts",
  "lib/sample-parts/records.ts",
  "features/sample-parts/actions.ts",
  "features/sample-parts/delete-record.tsx",
  "features/sample-parts/form.tsx",
  "features/sample-parts/list.tsx",
  "features/sample-parts/of-parent.tsx",
  "features/sample-parts/presentation.ts",
  "features/sample-parts/record.tsx",
  "features/sample-parts/schema.ts",
  "app/(app)/sample-parts/page.tsx",
  "app/(app)/sample-parts/new/page.tsx",
  "app/(app)/sample-parts/[id]/page.tsx",
  "app/(app)/sample-parts/[id]/edit/page.tsx",
  "messages/pt-BR/sampleParts.json",
  "tests/integration/sample-parts.test.ts",
  "e2e/sample-parts.spec.ts",
] as const;

/** The child sample's lines in the shared registries, written after the same anchors. */
export const childRegistrations = [
  {
    file: "lib/db/schema.product.ts",
    anchor: schemaImportAnchor,
    before: true,
    lines: ['import { samplePartStatus, sampleParts } from "./schema/sample-parts";'],
  },
  {
    file: "lib/db/schema.product.ts",
    anchor: "export const productSchema = {",
    lines: ["  sampleParts,", "  samplePartStatus,"],
  },
  {
    file: "lib/db/personal-data.product.ts",
    anchor: 'import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";',
    lines: ['import { sampleParts } from "./schema/sample-parts";'],
  },
  {
    file: "lib/db/personal-data.product.ts",
    anchor: "export const productExportedData: readonly Exported[] = [",
    lines: ['  { key: "sample_parts", table: sampleParts, owner: sampleParts.ownerId },'],
  },
] as const;

/** The child's entry in the navigation, written right below its parent's. */
export const childNavigation = {
  file: "lib/navigation.product.ts",
  line: '  { key: "sampleParts", href: "/sample-parts", group: "main", minimum: "member", icon: "folder" },',
} as const;

/**
 * What the parent's record page gets: the import of the child's section, and the section itself
 * right before the parent's record. The anchors are written with the first sample's names, which
 * stand for the parent. The template of the first sample is kept without these lines.
 */
export const parentPage = {
  file: "app/(app)/sample-items/[id]/page.tsx",
  importAnchor: 'import { SampleItemRecord } from "@/features/sample-items/record";',
  importLine: 'import { SamplePartsOfSampleItem } from "@/features/sample-parts/of-parent";',
  sectionAnchor:
    "      <SampleItemRecord item={item} canManage timeZone={timeZone} locale={locale} />",
  sectionLine:
    '      <SamplePartsOfSampleItem viewer={user} scope="mine" sampleItemId={id} canManage />',
} as const;

/** A file of the samples as the template keeps it: the parent's page without the child's lines. */
export const asTemplate = (file: string, text: string): string =>
  file === parentPage.file
    ? removeLines(text, [parentPage.importLine, parentPage.sectionLine])
    : text;

export const childCatalogKeys = [
  { file: "messages/pt-BR/nav.product.json", path: ["items", "sampleParts"], value: "Peças" },
  {
    file: "messages/pt-BR/errors.product.json",
    path: ["samplePartCodeTaken"],
    value: "Já existe um registro com esse código no seu cadastro.",
  },
  { file: "messages/pt-BR/errors.product.json", path: ["samplePartHasLinks"], value: inUse },
  {
    file: "messages/pt-BR/errors.product.json",
    path: ["samplePartParentMissing"],
    value: "Escolha um registro de amostras do seu cadastro.",
  },
] as const;

/** Writes a registration's lines at its anchor: after it, or before it when it says so. */
export function register(
  text: string,
  entry: { anchor: string; before?: boolean },
  lines: readonly string[],
): string {
  return entry.before === true
    ? insertBefore(text, entry.anchor, lines)
    : insertAfter(text, entry.anchor, lines);
}

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

/** Writes the lines right before the anchor. A line already there is not written twice. */
export function insertBefore(text: string, anchor: string, lines: readonly string[]): string {
  const at = text.indexOf(anchor);
  if (at === -1) {
    throw new Error(`the anchor is gone: ${anchor}`);
  }
  const missing = lines.filter((line) => !text.includes(line));
  if (missing.length === 0) {
    return text;
  }
  return `${text.slice(0, at)}${missing.join("\n")}\n${text.slice(at)}`;
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
