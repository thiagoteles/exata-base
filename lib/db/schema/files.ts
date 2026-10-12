import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../columns";
import { ownedBy } from "./user-references";

/* An uploaded file. Every file is private and opens through a signed URL with an expiry. */
export const files = pgTable(
  "files",
  {
    id: id(),
    ownerId: ownedBy().notNull(),
    name: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: integer().notNull(),
    storageKey: text().notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.ownerId)],
);
