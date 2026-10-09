import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { accounts, sessions } from "./schema/auth";
import { payments, plans } from "./schema/billing";
import { contactMessages } from "./schema/contact";
import { files } from "./schema/files";
import { users } from "./schema/users";

/*
 * What belongs to a person. Every table with an `ownedBy` key is listed exactly once: either in
 * the account export, with the column that points at the owner, or as not exported, with the
 * reason. A test fails when a table is missing, so a new table cannot skip this decision.
 */

type Exported = { key: string; table: PgTable; owner: AnyPgColumn };
type NotExported = { table: PgTable; reason: string };

export const exportedData: readonly Exported[] = [
  { key: "user", table: users, owner: users.id },
  { key: "plan", table: plans, owner: plans.userId },
  { key: "payments", table: payments, owner: payments.payerId },
  { key: "contact_messages", table: contactMessages, owner: contactMessages.userId },
  { key: "files", table: files, owner: files.ownerId },
];

export const notExportedData: readonly NotExported[] = [
  { table: sessions, reason: "short-lived sign-in sessions, deleted with the account" },
  { table: accounts, reason: "credentials and provider tokens, never handed out" },
];
