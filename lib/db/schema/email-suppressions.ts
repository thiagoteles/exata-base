import { pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../columns";

export const emailSuppressionCategory = pgEnum("email_suppression_category", ["billing"]);

/*
 * An address that asked to stop one kind of mail it has no account to turn off. The address is the
 * key, in lower case, and no person owns the row: it belongs to whoever receives the mail, so it is
 * kept after any account is deleted, which is what keeps a stopped address stopped.
 */
export const emailSuppressions = pgTable(
  "email_suppressions",
  {
    id: id(),
    address: text().notNull(),
    category: emailSuppressionCategory().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex().on(table.address, table.category)],
);
