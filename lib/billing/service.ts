import { eq } from "drizzle-orm";
import {
  type Entitlements,
  entitlementsOf,
  type Holder,
  isPaidTier,
} from "@/domain/billing/entitlements";
import { isFixedTerm } from "@/domain/billing/term";
import type { Database } from "@/lib/db/database";
import { plans } from "@/lib/db/schema/billing";
import { DomainError } from "@/lib/errors";
import type { Interval } from "@/lib/ports/payment/types";

/*
 * The billing rules that read a person's plan, against the database only. Money moves in the
 * payment provider; what one of its events means for a plan is in `events.ts`. The one call that
 * reaches out, ending a subscription, is handed in, so the rules are tested without a network.
 */

export type Plan = typeof plans.$inferSelect;
export type CancelSubscription = (subscriptionId: string) => Promise<void>;

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

/** What the holder may do now. The holder is a person today; the signature stays for organizations. */
export async function entitlementsFor(
  db: Database,
  holder: Holder,
  now: Date,
): Promise<Entitlements> {
  const plan = await readPlan(db, holder.id);
  return entitlementsOf(
    plan === null ? null : { ...plan, fixedTerm: isFixedTerm(plan.billingInterval) },
    now,
  );
}

/**
 * A free account may buy anything. Someone on a monthly or yearly subscription may buy the
 * lifetime plan, which replaces it. Everything else is changed in the customer portal.
 */
export function canBuy(plan: Plan | null, interval: Interval): boolean {
  if (plan === null || !isPaidTier(plan.tier)) {
    return true;
  }
  return interval === "lifetime" && plan.providerSubscriptionId !== null;
}

export const noCourtesy = {
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
  expiryWarnedAt: null,
} as const;

/** Turns cancellation at the end of the period on or off. The provider changes first. */
export async function changeCancellation(
  db: Database,
  userId: string,
  cancel: boolean,
  setAtProvider: (subscriptionId: string, cancel: boolean) => Promise<void>,
): Promise<void> {
  const plan = await readPlan(db, userId);
  if (plan === null || !isPaidTier(plan.tier) || plan.providerSubscriptionId === null) {
    throw new DomainError(409, "noSubscription");
  }
  await setAtProvider(plan.providerSubscriptionId, cancel);
  await db.update(plans).set({ cancelAtPeriodEnd: cancel }).where(eq(plans.userId, userId));
}
