import { sql } from "drizzle-orm";
import { boolean, check, index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, instant, updatedAt } from "../columns";
import { authoredBy, ownedBy } from "./user-references";

export const planTier = pgEnum("plan_tier", ["free", "paid"]);
export const planStatus = pgEnum("plan_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "pending",
]);
export const paymentProvider = pgEnum("payment_provider", ["stripe"]);
export const billingInterval = pgEnum("billing_interval", ["lifetime", "yearly", "monthly"]);

/*
 * One row per user, created by a database trigger when the user row is inserted, so every
 * account starts on the free plan whichever auth mode created it.
 */
export const plans = pgTable(
  "plans",
  {
    userId: ownedBy().primaryKey(),
    tier: planTier().notNull().default("free"),
    status: planStatus().notNull().default("active"),
    billingInterval: billingInterval(),
    /* The provider that sells this plan; null for a free or courtesy plan. */
    provider: paymentProvider(),
    providerCustomerId: text().unique(),
    providerSubscriptionId: text().unique(),
    /* The catalog price that was bought (tier and interval), never the provider's price id. */
    priceKey: text(),
    /* Set when a trial starts, so the same account never gets a second one. */
    trialUsedAt: instant(),
    cancelAtPeriodEnd: boolean().notNull().default(false),
    /* When the period already paid ends: the renewal date, or the day access stops if canceled. */
    currentPeriodEnd: instant(),
    courtesyGrantedBy: authoredBy(),
    courtesyGrantedByEmail: text(),
    courtesyReason: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index().on(table.courtesyGrantedBy),
    check(
      "plans_free_has_no_interval",
      sql`${table.tier} <> 'free' or ${table.billingInterval} is null`,
    ),
    check(
      "plans_courtesy_is_complete",
      sql`(${table.courtesyGrantedByEmail} is null) = (${table.courtesyReason} is null)`,
    ),
  ],
);

/* Provider webhook deliveries. Inserting the id is the replay lock: a second delivery conflicts. */
export const paymentEvents = pgTable("payment_events", {
  id: text().primaryKey(),
  provider: paymentProvider().notNull(),
  type: text().notNull(),
  receivedAt: createdAt(),
});
