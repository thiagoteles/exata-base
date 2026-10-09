import { and, eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { paymentEvents, plans } from "@/lib/db/schema/billing";
import { DomainError } from "@/lib/errors";
import type { Interval, PaymentEvent } from "@/lib/ports/payment/types";

/*
 * The billing rules, against the database only. Money moves in the payment provider; this module
 * decides what a provider event means for a person's plan. The one call that reaches out, ending
 * a subscription, is handed in, so the rules are tested without a network.
 */

export type Plan = typeof plans.$inferSelect;
export type CancelSubscription = (subscriptionId: string) => Promise<void>;

/** Access follows the tier. A failed charge keeps it (status `past_due`) until the subscription ends. */
export const grantsAccess = (plan: Pick<Plan, "tier"> | null): boolean => plan?.tier === "paid";

/** A sale rather than a gift: courtesy is told apart by who granted it. */
export const isCourtesy = (plan: Pick<Plan, "courtesyGrantedByEmail">): boolean =>
  plan.courtesyGrantedByEmail !== null;

/** The subscription a plan is paid through, or null for a free, courtesy or lifetime plan. */
export const subscriptionOf = (plan: Pick<Plan, "providerSubscriptionId"> | null): string | null =>
  plan?.providerSubscriptionId ?? null;

export async function readPlan(db: Database, userId: string): Promise<Plan | null> {
  const [plan] = await db.select().from(plans).where(eq(plans.userId, userId));
  return plan ?? null;
}

/**
 * A free account may buy anything. Someone on a monthly or yearly subscription may buy the
 * lifetime plan, which replaces it. Everything else is changed in the customer portal.
 */
export function canBuy(plan: Plan | null, interval: Interval): boolean {
  if (plan === null || plan.tier === "free") {
    return true;
  }
  return interval === "lifetime" && plan.providerSubscriptionId !== null;
}

const noCourtesy = {
  courtesyGrantedBy: null,
  courtesyGrantedByEmail: null,
  courtesyReason: null,
} as const;

export const freePlan = {
  tier: "free",
  status: "canceled",
  billingInterval: null,
  priceKey: null,
  providerSubscriptionId: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
} as const;

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function applyCheckout(
  tx: Transaction,
  event: Extract<PaymentEvent, { kind: "checkout_paid" }>,
  cancel: CancelSubscription,
): Promise<void> {
  const [current] = await tx
    .select()
    .from(plans)
    .where(eq(plans.userId, event.userId))
    .for("update");
  if (current === undefined) {
    return;
  }
  const replaced = event.interval === "lifetime" ? current.providerSubscriptionId : null;
  await tx
    .update(plans)
    .set({
      tier: "paid",
      status: "active",
      billingInterval: event.interval,
      provider: event.provider,
      priceKey: `paid.${event.interval}`,
      providerCustomerId: event.customerId ?? current.providerCustomerId,
      providerSubscriptionId: event.interval === "lifetime" ? null : event.subscriptionId,
      cancelAtPeriodEnd: false,
      // A new purchase has no end yet: the first invoice that follows says when the period ends.
      currentPeriodEnd: null,
      ...noCourtesy,
    })
    .where(eq(plans.userId, event.userId));
  // The lifetime purchase ends the subscription it replaces, now and with no credit. Doing it
  // inside the transaction means a failure here rolls the plan back and the provider retries.
  if (replaced !== null) {
    await cancel(replaced);
  }
}

async function applyRefund(
  tx: Transaction,
  event: Extract<PaymentEvent, { kind: "charge_refunded" }>,
  cancel: CancelSubscription,
): Promise<void> {
  // A partial refund is only recorded, with the event itself. Only a full one takes the plan back.
  if (!event.fullyRefunded) {
    return;
  }
  const [current] = await tx
    .select()
    .from(plans)
    .where(eq(plans.providerCustomerId, event.customerId))
    .for("update");
  if (current === undefined) {
    return;
  }
  await tx.update(plans).set(freePlan).where(eq(plans.userId, current.userId));
  if (current.providerSubscriptionId !== null) {
    await cancel(current.providerSubscriptionId);
  }
}

async function applyEvent(
  tx: Transaction,
  event: PaymentEvent,
  cancel: CancelSubscription,
): Promise<void> {
  switch (event.kind) {
    case "checkout_paid":
      return applyCheckout(tx, event, cancel);
    case "invoice_paid":
      await tx
        .update(plans)
        .set({
          status: "active",
          ...(event.periodEnd === null ? {} : { currentPeriodEnd: event.periodEnd }),
        })
        .where(and(eq(plans.providerSubscriptionId, event.subscriptionId), eq(plans.tier, "paid")));
      return;
    case "invoice_failed":
      await tx
        .update(plans)
        .set({ status: "past_due" })
        .where(and(eq(plans.providerSubscriptionId, event.subscriptionId), eq(plans.tier, "paid")));
      return;
    case "subscription_deleted":
      // A subscription replaced by the lifetime plan no longer matches any row, so it is ignored.
      await tx
        .update(plans)
        .set(freePlan)
        .where(eq(plans.providerSubscriptionId, event.subscriptionId));
      return;
    case "charge_refunded":
      return applyRefund(tx, event, cancel);
    case "ignored":
      return;
    default:
      return event satisfies never;
  }
}

/**
 * Applies one provider event. Inserting the event id is the replay lock: a delivery seen before
 * conflicts and does nothing. The lock and the change commit together, so a failed change leaves
 * the event unseen and the provider's retry applies it.
 */
export function applyPaymentEvent(
  db: Database,
  event: PaymentEvent,
  cancel: CancelSubscription,
): Promise<"applied" | "duplicate"> {
  return db.transaction(async (tx) => {
    const locked = await tx
      .insert(paymentEvents)
      .values({ id: event.id, provider: event.provider, type: event.type })
      .onConflictDoNothing()
      .returning({ id: paymentEvents.id });
    if (locked.length === 0) {
      return "duplicate";
    }
    await applyEvent(tx, event, cancel);
    return "applied";
  });
}

/** Turns cancellation at the end of the period on or off. The provider changes first. */
export async function changeCancellation(
  db: Database,
  userId: string,
  cancel: boolean,
  setAtProvider: (subscriptionId: string, cancel: boolean) => Promise<void>,
): Promise<void> {
  const plan = await readPlan(db, userId);
  if (plan === null || plan.tier !== "paid" || plan.providerSubscriptionId === null) {
    throw new DomainError(409, "noSubscription");
  }
  await setAtProvider(plan.providerSubscriptionId, cancel);
  await db.update(plans).set({ cancelAtPeriodEnd: cancel }).where(eq(plans.userId, userId));
}
