import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { catalog } from "@/domain/billing/catalog";
import { isFixedTerm, oneYearAfter } from "@/domain/billing/term";
import type { Database } from "@/lib/db/database";
import { checkoutSessions, paymentEvents, plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import type { PaymentEvent } from "@/lib/ports/payment/types";
import {
  linkPayments,
  type NewDispute,
  type NewPayment,
  type NewRefund,
  recordDispute,
  recordPayment,
  recordRefund,
} from "./payments";
import { type CancelSubscription, freePlan, noCourtesy } from "./service";

/*
 * What a provider's event means for a person's plan, in one transaction with the replay lock. The
 * plan reads and the guards are in the service; this is the part that changes the plan.
 */

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** When the paid period ends, if the purchase already says: the trial's end, or a year after a year bought once. */
function periodEndOf(event: Extract<PaymentEvent, { kind: "checkout_paid" }>): Date | null {
  if (event.trialEndsAt !== null) {
    return event.trialEndsAt;
  }
  return isFixedTerm(event.interval) ? oneYearAfter(event.paidAt) : null;
}

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
  const trialing = event.trialEndsAt !== null;
  await tx
    .update(plans)
    .set({
      tier: catalog.paidTier,
      status: trialing ? "trialing" : "active",
      billingInterval: event.interval,
      provider: event.provider,
      priceKey: `${catalog.paidTier}.${event.interval}`,
      providerCustomerId: event.customerId ?? current.providerCustomerId,
      providerSubscriptionId: event.interval === "lifetime" ? null : event.subscriptionId,
      cancelAtPeriodEnd: false,
      // A subscription has no end yet: the first invoice that follows says when the period ends. A year
      // bought once ends a year after it was paid, which is known now.
      currentPeriodEnd: periodEndOf(event),
      expiryWarnedAt: null,
      // A trial is spent the moment it starts, so it can never be started again.
      ...(trialing ? { trialUsedAt: event.paidAt } : {}),
      ...noCourtesy,
    })
    .where(eq(plans.userId, event.userId));
  const customerId = event.customerId ?? current.providerCustomerId;
  if (customerId !== null) {
    const [person] = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, event.userId));
    if (person !== undefined) {
      await linkPayments(tx, customerId, person);
    }
  }
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

/** What a delivery caused that the caller does once it is committed: events to count, an e-mail to send. */
export type Effects = {
  newPayment: NewPayment | null;
  trialStarted: { userId: string; interval: string } | null;
  refund: NewRefund | null;
  trialEnding: { userId: string; email: string; name: string; endsAt: Date } | null;
  dispute: NewDispute | null;
  /** The checkout this payment closed, with the screen that started it, for the funnel. */
  checkoutCompleted: { userId: string; interval: string; source: string } | null;
};

const none: Effects = {
  newPayment: null,
  trialStarted: null,
  refund: null,
  trialEnding: null,
  dispute: null,
  checkoutCompleted: null,
};

type TrailStatus = "pending" | "paid" | "expired" | "failed";

/**
 * Moves a checkout's trail to where it ended. Only a checkout that was still open or waiting moves, so a
 * late or repeated event cannot take a paid one back. The time is the database's own.
 */
async function moveTrail(tx: Transaction, sessionId: string, status: TrailStatus) {
  const closes = status !== "pending";
  const [row] = await tx
    .update(checkoutSessions)
    .set({ status, ...(closes ? { closedAt: sql`now()` } : {}) })
    .where(
      and(
        eq(checkoutSessions.providerSessionId, sessionId),
        inArray(checkoutSessions.status, ["open", "pending"]),
      ),
    )
    .returning({
      userId: checkoutSessions.userId,
      interval: checkoutSessions.interval,
      source: checkoutSessions.source,
    });
  return row ?? null;
}

/** Who is to be told their trial is about to end: the person whose plan is still trialing on that subscription. */
async function trialEndingOf(
  tx: Transaction,
  event: Extract<PaymentEvent, { kind: "trial_ending" }>,
): Promise<Effects["trialEnding"]> {
  const [person] = await tx
    .select({ userId: users.id, email: users.email, name: users.name })
    .from(plans)
    .innerJoin(users, eq(users.id, plans.userId))
    .where(
      and(eq(plans.providerSubscriptionId, event.subscriptionId), eq(plans.status, "trialing")),
    );
  return person === undefined ? null : { ...person, endsAt: event.endsAt };
}

async function applyEvent(
  tx: Transaction,
  event: PaymentEvent,
  cancel: CancelSubscription,
): Promise<Effects> {
  switch (event.kind) {
    case "checkout_paid":
      await applyCheckout(tx, event, cancel);
      return {
        ...none,
        trialStarted:
          event.trialEndsAt === null ? null : { userId: event.userId, interval: event.interval },
        checkoutCompleted: await moveTrail(tx, event.sessionId, "paid"),
      };
    case "checkout_pending":
      // Only an account with nothing paid waits: a person who already has a plan keeps it, and the
      // payment that arrives later replaces it as any purchase does.
      await tx
        .update(plans)
        .set({
          status: "pending",
          provider: event.provider,
          priceKey: `${catalog.paidTier}.${event.interval}`,
        })
        .where(and(eq(plans.userId, event.userId), eq(plans.tier, "free")));
      await moveTrail(tx, event.sessionId, "pending");
      return none;
    case "checkout_failed":
      // What was waiting is not coming: the account is an ordinary free one again.
      await tx
        .update(plans)
        .set({ status: "active", provider: null, priceKey: null })
        .where(
          and(eq(plans.userId, event.userId), eq(plans.tier, "free"), eq(plans.status, "pending")),
        );
      await moveTrail(tx, event.sessionId, event.expired ? "expired" : "failed");
      return none;
    case "invoice_paid":
      await tx
        .update(plans)
        .set({
          status: "active",
          ...(event.periodEnd === null ? {} : { currentPeriodEnd: event.periodEnd }),
        })
        .where(and(eq(plans.providerSubscriptionId, event.subscriptionId), ne(plans.tier, "free")));
      return none;
    case "invoice_failed":
      await tx
        .update(plans)
        .set({ status: "past_due" })
        .where(and(eq(plans.providerSubscriptionId, event.subscriptionId), ne(plans.tier, "free")));
      return none;
    case "subscription_deleted":
      // A subscription replaced by the lifetime plan no longer matches any row, so it is ignored.
      await tx
        .update(plans)
        .set(freePlan)
        .where(eq(plans.providerSubscriptionId, event.subscriptionId));
      return none;
    case "payment_succeeded":
      return { ...none, newPayment: await recordPayment(tx, event) };
    case "charge_refunded": {
      const refund = await recordRefund(tx, event);
      await applyRefund(tx, event, cancel);
      return { ...none, refund };
    }
    case "dispute_created":
      return { ...none, dispute: await recordDispute(tx, event) };
    case "trial_ending":
      return { ...none, trialEnding: await trialEndingOf(tx, event) };
    case "prices_changed":
    case "ignored":
      return none;
    default:
      return event satisfies never;
  }
}

/**
 * Applies one provider event. Inserting the event id is the replay lock: a delivery seen before
 * conflicts and does nothing. The lock and the change commit together, so a failed change leaves
 * the event unseen and the provider's retry applies it. A payment the event recorded for the first
 * time comes back with the outcome, so the caller can count it once it is committed.
 */
export function applyPaymentEvent(
  db: Database,
  event: PaymentEvent,
  cancel: CancelSubscription,
): Promise<{ status: "applied" | "duplicate"; newPayment: NewPayment | null; effects: Effects }> {
  return db.transaction(async (tx) => {
    const locked = await tx
      .insert(paymentEvents)
      .values({ id: event.id, provider: event.provider, type: event.type })
      .onConflictDoNothing()
      .returning({ id: paymentEvents.id });
    if (locked.length === 0) {
      return { status: "duplicate", newPayment: null, effects: none };
    }
    const effects = await applyEvent(tx, event, cancel);
    return { status: "applied", newPayment: effects.newPayment, effects };
  });
}
