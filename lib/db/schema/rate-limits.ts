import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { instant } from "../columns";

/*
 * One counter per subject and window. The key is a hash of the limit's name, the subject (a user
 * id or an address) and the window's start, so no address is ever stored. A row lives for one
 * window and the daily call deletes the expired ones.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text().primaryKey(),
    hits: integer().notNull(),
    expiresAt: instant().notNull(),
  },
  (table) => [index().on(table.expiresAt)],
);
