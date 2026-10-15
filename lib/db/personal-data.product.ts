import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { sampleItems } from "./schema/sample-items";
import { sampleParts } from "./schema/sample-parts";

/*
 * What of the product's own tables belongs to a person: each one with an `ownedBy` key is listed
 * once, exported with the column that points at the owner, or not exported with the reason. The
 * product owns this file; the base ships it with its samples.
 */

type Exported = { key: string; table: PgTable; owner: AnyPgColumn };
type NotExported = { table: PgTable; reason: string };

export const productExportedData: readonly Exported[] = [
  { key: "sample_parts", table: sampleParts, owner: sampleParts.ownerId },
  { key: "sample_items", table: sampleItems, owner: sampleItems.ownerId },
];

export const productNotExportedData: readonly NotExported[] = [];
