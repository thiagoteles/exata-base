import { is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { accountDeletions, deletionRequester, staffAuditLog } from "./schema/audit";
import { accounts, clerkEvents, sessions, verifications } from "./schema/auth";
import { billingInterval, planStatus, plans, planTier, stripeEvents } from "./schema/billing";
import { contactMessages, contactStatus, contactSubject } from "./schema/contact";
import { files } from "./schema/files";
import { invites } from "./schema/invites";
import { userRole, users } from "./schema/users";

/** Every table and enum. A new table is added here and in the personal data registry. */
export const schema = {
  users,
  userRole,
  sessions,
  accounts,
  verifications,
  clerkEvents,
  invites,
  plans,
  planTier,
  planStatus,
  billingInterval,
  stripeEvents,
  contactMessages,
  contactSubject,
  contactStatus,
  files,
  staffAuditLog,
  accountDeletions,
  deletionRequester,
};

/** The tables alone, without the enums. */
export const tables: readonly PgTable[] = (Object.values(schema) as unknown[]).filter(
  (value): value is PgTable => is(value, PgTable),
);
