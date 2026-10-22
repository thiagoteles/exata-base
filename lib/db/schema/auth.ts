import { boolean, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, instant, updatedAt } from "../columns";
import { ownedBy } from "./user-references";

/* Tables used only in local auth mode, by better-auth. They stay empty in Clerk mode. */

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: ownedBy().notNull(),
    token: text().notNull().unique(),
    expiresAt: instant().notNull(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    userId: ownedBy().notNull(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: instant(),
    refreshTokenExpiresAt: instant(),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: id(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: instant().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.identifier)],
);

/*
 * The authenticator secret and the backup codes of a local account, encrypted by better-auth.
 * One row per account. It goes away with the account, because a deleted person has nothing to sign in to.
 */
export const twoFactors = pgTable(
  "two_factors",
  {
    id: id(),
    userId: ownedBy().notNull(),
    secret: text().notNull(),
    backupCodes: text().notNull(),
    verified: boolean().notNull().default(false),
    failedVerificationCount: integer().notNull().default(0),
    lockedUntil: instant(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex().on(table.userId)],
);

/* Clerk webhook deliveries. Inserting the id is the replay lock: a second delivery conflicts. */
export const clerkEvents = pgTable("clerk_events", {
  id: text().primaryKey(),
  type: text().notNull(),
  receivedAt: createdAt(),
});
