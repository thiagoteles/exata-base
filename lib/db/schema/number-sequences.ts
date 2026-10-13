import { integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../columns";
import { ownedBy } from "./user-references";

/*
 * One counter per person and series. The number that was last handed out is kept, and the next is
 * taken by an update inside the caller's transaction, so two callers never get the same number and
 * a transaction that is rolled back gives its number back.
 */
export const numberSequences = pgTable(
  "number_sequences",
  {
    id: id(),
    ownerId: ownedBy().notNull(),
    series: text().notNull(),
    lastValue: integer().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex().on(table.ownerId, table.series)],
);
