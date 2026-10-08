import { sql } from "drizzle-orm";
import { check, index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, instant, updatedAt } from "../columns";
import { authoredBy } from "./user-references";
import { userRole } from "./users";

export const invites = pgTable(
  "invites",
  {
    id: id(),
    email: text().notNull(),
    role: userRole().notNull(),
    tokenHash: text().notNull().unique(),
    expiresAt: instant().notNull(),
    acceptedAt: instant(),
    revokedAt: instant(),
    invitedBy: authoredBy(),
    invitedByEmail: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index().on(table.email),
    index().on(table.invitedBy),
    check("invites_email_lowercase", sql`${table.email} = lower(${table.email})`),
  ],
);
