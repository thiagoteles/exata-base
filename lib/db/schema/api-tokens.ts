import { index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, instant, updatedAt } from "../columns";
import { ownedBy } from "./user-references";

export const apiTokens = pgTable(
  "api_tokens",
  {
    id: id(),
    userId: ownedBy().notNull(),
    name: text().notNull(),
    /** Only the hash of the token is kept; the token itself is shown once, when it is made. */
    tokenHash: text().notNull().unique(),
    /** The visible start of the token, to tell tokens apart in a list. */
    prefix: text().notNull(),
    scopes: text().array().notNull(),
    expiresAt: instant(),
    revokedAt: instant(),
    lastUsedAt: instant(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.userId)],
);
