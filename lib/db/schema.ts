import { is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { apiTokens } from "./schema/api-tokens";
import { accountDeletions, deletionRequester, staffAuditLog } from "./schema/audit";
import { accounts, clerkEvents, sessions, verifications } from "./schema/auth";
import {
  billingInterval,
  checkoutSessions,
  checkoutStatus,
  paymentEvents,
  paymentProvider,
  paymentStatus,
  payments,
  planStatus,
  plans,
  planTier,
} from "./schema/billing";
import { contactMessages, contactStatus, contactSubject } from "./schema/contact";
import { emailSuppressionCategory, emailSuppressions } from "./schema/email-suppressions";
import { exchangeQuoteStatus, exchangeQuotes } from "./schema/exchange-quotes";
import { files } from "./schema/files";
import { invites } from "./schema/invites";
import { numberSequences } from "./schema/number-sequences";
import { jobRuns } from "./schema/operations";
import { rateLimits } from "./schema/rate-limits";
import { referrals } from "./schema/referrals";
import { sampleItemStatus, sampleItems } from "./schema/sample-items";
import { samplePartStatus, sampleParts } from "./schema/sample-parts";
import { userRole, users } from "./schema/users";

/** Every table and enum. A new table is added here and in the personal data registry. */
export const schema = {
  sampleParts,
  samplePartStatus,
  users,
  userRole,
  sessions,
  accounts,
  verifications,
  clerkEvents,
  invites,
  apiTokens,
  plans,
  planTier,
  planStatus,
  billingInterval,
  checkoutSessions,
  checkoutStatus,
  paymentEvents,
  paymentProvider,
  payments,
  paymentStatus,
  contactMessages,
  contactSubject,
  contactStatus,
  emailSuppressions,
  emailSuppressionCategory,
  exchangeQuotes,
  exchangeQuoteStatus,
  files,
  numberSequences,
  rateLimits,
  jobRuns,
  referrals,
  sampleItems,
  sampleItemStatus,
  staffAuditLog,
  accountDeletions,
  deletionRequester,
};

/** The tables alone, without the enums. */
export const tables: readonly PgTable[] = (Object.values(schema) as unknown[]).filter(
  (value): value is PgTable => is(value, PgTable),
);
