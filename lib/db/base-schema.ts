/*
 * The schema files that are the base's own tables, in `lib/db/schema/`. Their migrations are the
 * base's stream (`lib/db/migrations`), which only the base writes; every other file there is the
 * product's, and its migrations are the product's stream (`lib/db/product-migrations`). A new table
 * of the base is added here; a product never edits this list.
 */
export const baseSchemaFiles = [
  "api-tokens.ts",
  "audit.ts",
  "auth.ts",
  "billing.ts",
  "contact.ts",
  "email-suppressions.ts",
  "exchange-quotes.ts",
  "files.ts",
  "invites.ts",
  "number-sequences.ts",
  "operations.ts",
  "rate-limits.ts",
  "referrals.ts",
  "user-references.ts",
  "users.ts",
] as const;
