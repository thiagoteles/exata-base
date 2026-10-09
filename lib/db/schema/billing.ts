import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { tierNames } from "@/domain/billing/entitlements";
import { createdAt, id, instant, updatedAt } from "../columns";
import { authoredBy, ownedBy } from "./user-references";

// The tiers come from the catalog, so the database refuses a tier the product does not sell.
export const planTier = pgEnum("plan_tier", tierNames);
export const planStatus = pgEnum("plan_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "pending",
]);
export const paymentProvider = pgEnum("payment_provider", ["stripe"]);
export const billingInterval = pgEnum("billing_interval", [
  "lifetime",
  "yearly",
  "monthly",
  "yearly_once",
]);

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
    /* When the warning that a fixed term is about to end went out, so it goes out once. */
    expiryWarnedAt: instant(),
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

export const checkoutStatus = pgEnum("checkout_status", [
  "open",
  "pending",
  "paid",
  "expired",
  "failed",
]);

/*
 * Every checkout a person opened, and how it ended. It is the trail that says where purchases are
 * lost: opened and never paid, expired, failed. `source` is the screen or block that showed the offer
 * when the person chose to buy, so conversion can be read by where the offer was. The row goes with the
 * account; what was bought lives in the plan and the payments.
 */
export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: id(),
    userId: ownedBy().notNull(),
    provider: paymentProvider().notNull(),
    providerSessionId: text().notNull().unique(),
    interval: billingInterval().notNull(),
    status: checkoutStatus().notNull().default("open"),
    source: text().notNull(),
    currency: text(),
    trialDays: integer().notNull().default(0),
    /* When it stopped being open: paid, expired or failed. */
    closedAt: instant(),
    /* When the reminder about this abandoned checkout was claimed, so it is sent once. */
    abandonedEmailAt: instant(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.userId), index().on(table.status, table.createdAt)],
);

/* Provider webhook deliveries. Inserting the id is the replay lock: a second delivery conflicts. */
export const paymentEvents = pgTable("payment_events", {
  id: text().primaryKey(),
  provider: paymentProvider().notNull(),
  type: text().notNull(),
  receivedAt: createdAt(),
});

export const paymentStatus = pgEnum("payment_status", [
  "paid",
  "partially_refunded",
  "refunded",
  "disputed",
]);

/*
 * Every charge the provider confirmed, kept locally so revenue, a person's history and the
 * account export never call the provider. One row per charge: the charge id is the key, so a
 * repeated delivery and a refund both find the same row. The payer stays as an e-mail after the
 * account is deleted, because a payment is a fiscal fact, not the person's data alone.
 */
export const payments = pgTable(
  "payments",
  {
    id: id(),
    provider: paymentProvider().notNull(),
    providerPaymentId: text().notNull().unique(),
    providerCustomerId: text(),
    /* Null until the checkout ties the provider's customer to a person, or after deletion. */
    payerId: authoredBy(),
    payerEmail: text(),
    amountCents: integer().notNull(),
    refundedCents: integer().notNull().default(0),
    currency: text().notNull(),
    /* As the provider names it: card, pix, boleto. Null when the provider did not say. */
    method: text(),
    status: paymentStatus().notNull().default("paid"),
    paidAt: instant().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index().on(table.payerId),
    index().on(table.providerCustomerId),
    index().on(table.paidAt),
    check("payments_amount_positive", sql`${table.amountCents} > 0`),
    check(
      "payments_refund_within_amount",
      sql`${table.refundedCents} between 0 and ${table.amountCents}`,
    ),
    check("payments_currency_lowercase", sql`${table.currency} = lower(${table.currency})`),
  ],
);
