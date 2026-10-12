import { index, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id } from "../columns";
import { authoredBy } from "./user-references";

/* Every write made by staff or an admin: who, what and when. Append-only. */
export const staffAuditLog = pgTable(
  "staff_audit_log",
  {
    id: id(),
    actorId: authoredBy(),
    actorEmail: text().notNull(),
    action: text().notNull(),
    targetTable: text().notNull(),
    targetId: text(),
    details: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.actorId), index().on(table.createdAt)],
);

export const deletionRequester = pgEnum("deletion_requester", ["self", "admin"]);

/*
 * The trail of deleted accounts. It never points at the deleted row: it keeps the former id, a
 * hash of the e-mail, and who asked for the deletion. Append-only.
 */
export const accountDeletions = pgTable("account_deletions", {
  id: id(),
  formerUserId: uuid().notNull(),
  emailHash: text().notNull(),
  requestedBy: deletionRequester().notNull(),
  requestedByEmail: text(),
  createdAt: createdAt(),
});
