import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../columns";
import { ownedBy } from "./user-references";

/*
 * An uploaded file. Every file is private and opens through a signed URL with an expiry. A file may
 * be attached to a record of the product: `subjectType` names the kind of record, `subjectId` is its
 * id and `kind` says what the file is for it (a statement, a contract). The link is not a foreign
 * key, because the base does not know the product's tables, so the code that deletes a record
 * removes its files with it.
 */
export const files = pgTable(
  "files",
  {
    id: id(),
    ownerId: ownedBy().notNull(),
    name: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: integer().notNull(),
    storageKey: text().notNull().unique(),
    subjectType: text(),
    subjectId: uuid(),
    kind: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index().on(table.ownerId),
    index().on(table.ownerId, table.subjectType, table.subjectId),
  ],
);
