import { and, eq, exists, inArray, isNotNull, isNull } from "drizzle-orm";
import { catalog } from "@/domain/billing/catalog";
import { creditFor } from "@/domain/referral/credit";
import type { Database } from "@/lib/db/database";
import { payments, plans } from "@/lib/db/schema/billing";
import { referrals } from "@/lib/db/schema/referrals";
import { users } from "@/lib/db/schema/users";
import type { PaymentGateway } from "@/lib/ports/payment/types";

/*
 * Paying an inviter for the people they brought. When an invited person has paid for the first time, the
 * inviter gets a credit on their balance at the payment provider, taken off their next invoice. The
 * arrival is claimed first, in one update, and the credit is granted under a key made from it: two
 * callers at once cannot both grant, and a grant that fails gives the claim back for the next call. What
 * is asked of the provider is only an amount, never who the invited person is.
 */

type Pending = { id: string; referrerId: string | null; referredId: string };

/** The invitations whose invited person has paid and whose inviter has not been credited yet. */
function pendingRewards(db: Database, referredId?: string): Promise<Pending[]> {
  return db
    .select({
      id: referrals.id,
      referrerId: referrals.referrerId,
      referredId: referrals.referredId,
    })
    .from(referrals)
    .where(
      and(
        isNull(referrals.rewardedAt),
        isNotNull(referrals.referrerId),
        referredId === undefined ? undefined : eq(referrals.referredId, referredId),
        exists(
          db
            .select({ one: payments.id })
            .from(payments)
            .where(
              and(
                eq(payments.payerId, referrals.referredId),
                inArray(payments.status, ["paid", "partially_refunded"]),
              ),
            ),
        ),
      ),
    );
}

async function rewardOne(
  db: Database,
  gateway: PaymentGateway,
  pending: Pending,
  now: Date,
): Promise<"granted" | "skipped" | "failed"> {
  const cents = creditFor({
    configuredCents: catalog.referralCredit.cents,
    referrerId: pending.referrerId,
    referredId: pending.referredId,
    rewardedAt: null,
    referredHasPaid: true,
  });
  if (cents === 0 || pending.referrerId === null) {
    return "skipped";
  }
  const currency = catalog.currencies.default;
  const [claimed] = await db
    .update(referrals)
    .set({ rewardedAt: now, rewardCents: cents, rewardCurrency: currency })
    .where(and(eq(referrals.id, pending.id), isNull(referrals.rewardedAt)))
    .returning({ id: referrals.id });
  if (claimed === undefined) {
    return "skipped";
  }
  try {
    const [inviter] = await db
      .select({ id: users.id, email: users.email, customerId: plans.providerCustomerId })
      .from(users)
      .innerJoin(plans, eq(plans.userId, users.id))
      .where(eq(users.id, pending.referrerId));
    if (inviter === undefined) {
      throw new Error("the inviter has no account to credit");
    }
    const granted = await gateway.grantCredit({
      customerId: inviter.customerId,
      email: inviter.email,
      userId: inviter.id,
      cents,
      currency,
      description: "referral",
      idempotencyKey: `referral-${pending.id}`,
    });
    if (inviter.customerId === null) {
      // The customer made for the credit is the inviter's from now on, so their next purchase uses it.
      await db
        .update(plans)
        .set({ providerCustomerId: granted.customerId })
        .where(and(eq(plans.userId, inviter.id), isNull(plans.providerCustomerId)));
    }
    return "granted";
  } catch {
    await db
      .update(referrals)
      .set({ rewardedAt: null, rewardCents: null, rewardCurrency: null })
      .where(eq(referrals.id, pending.id));
    return "failed";
  }
}

/** Credits every inviter owed one, or only the one whose invited person just paid. */
export async function grantReferralCredits(
  db: Database,
  gateway: PaymentGateway,
  input: { now: Date; referredId?: string },
): Promise<{ granted: number; failed: number }> {
  const counts = { granted: 0, failed: 0 };
  for (const pending of await pendingRewards(db, input.referredId)) {
    // One credit at a time, so a slow provider is not hit with a burst.
    // biome-ignore lint/performance/noAwaitInLoops: sequential on purpose
    const outcome = await rewardOne(db, gateway, pending, input.now);
    if (outcome !== "skipped") {
      counts[outcome] += 1;
    }
  }
  return counts;
}

/** What an inviter has earned so far, in cents of the default currency. */
export async function earnedCredit(db: Database, userId: string): Promise<number> {
  const rows = await db
    .select({ cents: referrals.rewardCents })
    .from(referrals)
    .where(and(eq(referrals.referrerId, userId), isNotNull(referrals.rewardedAt)));
  return rows.reduce((total, row) => total + (row.cents ?? 0), 0);
}
