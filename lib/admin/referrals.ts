import { and, count, desc, eq, exists, inArray, isNotNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { payments } from "@/lib/db/schema/billing";
import { referrals } from "@/lib/db/schema/referrals";
import { users } from "@/lib/db/schema/users";
import { type AdminViewer, assertAdmin } from "./guard";

/*
 * How the referral program is going, read from the invitations themselves: how many people arrived
 * by a link, how many of them have paid, what the inviters were credited, who brought the most and
 * from where. An invited person counts as paying once any payment of theirs went through, refunded
 * in part or not; a full refund does not count. Credit is summed in reais only, like the rest of the admin numbers.
 */

const RECENT = 20;
const TOP = 10;

export type ReferralTotals = {
  arrivals: number;
  paying: number;
  rewarded: number;
  rewardedCents: number;
  /** Paid, with an inviter still there, and not credited yet: a grant still due or one that failed. */
  awaitingCredit: number;
};

export type TopReferrer = {
  referrerId: string | null;
  email: string;
  arrivals: number;
  paying: number;
  rewardedCents: number;
};

export type RecentReferral = {
  id: string;
  referredId: string;
  referredEmail: string;
  referrerId: string | null;
  referrerEmail: string;
  source: string | null;
  createdAt: Date;
  paying: boolean;
  rewarded: boolean;
};

export type ReferralReport = {
  totals: ReferralTotals;
  top: TopReferrer[];
  sources: { source: string | null; arrivals: number }[];
  recent: RecentReferral[];
};

const int = (expression: ReturnType<typeof sql>) => sql<number>`(${expression})::int`;

export async function readReferralReport(
  db: Database,
  viewer: AdminViewer,
): Promise<ReferralReport> {
  assertAdmin(viewer);
  const paying = exists(
    db
      .select({ one: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.payerId, referrals.referredId),
          inArray(payments.status, ["paid", "partially_refunded"]),
        ),
      ),
  );
  const payingCount = int(sql`count(*) filter (where ${paying})`);
  const rewardedReais = int(
    sql`coalesce(sum(${referrals.rewardCents}) filter (where ${referrals.rewardCurrency} = 'brl'), 0)`,
  );

  const [totals, top, sources, recent] = await Promise.all([
    db
      .select({
        arrivals: count(),
        paying: payingCount,
        rewarded: count(referrals.rewardedAt),
        rewardedCents: rewardedReais,
        awaitingCredit: int(
          sql`count(*) filter (where ${paying} and ${referrals.rewardedAt} is null and ${referrals.referrerId} is not null)`,
        ),
      })
      .from(referrals),
    db
      .select({
        referrerId: referrals.referrerId,
        email: referrals.referrerEmail,
        arrivals: count(),
        paying: payingCount,
        rewardedCents: rewardedReais,
      })
      .from(referrals)
      .groupBy(referrals.referrerId, referrals.referrerEmail)
      .orderBy(desc(count()), desc(payingCount), referrals.referrerEmail)
      .limit(TOP),
    db
      .select({ source: referrals.source, arrivals: count() })
      .from(referrals)
      .groupBy(referrals.source)
      .orderBy(desc(count()), referrals.source),
    db
      .select({
        id: referrals.id,
        referredId: referrals.referredId,
        referredEmail: users.email,
        referrerId: referrals.referrerId,
        referrerEmail: referrals.referrerEmail,
        source: referrals.source,
        createdAt: referrals.createdAt,
        paying: sql<boolean>`${paying}`,
        rewarded: isNotNull(referrals.rewardedAt).mapWith(Boolean),
      })
      .from(referrals)
      .innerJoin(users, eq(users.id, referrals.referredId))
      .orderBy(desc(referrals.createdAt), desc(referrals.id))
      .limit(RECENT),
  ]);

  return {
    totals: totals[0] ?? {
      arrivals: 0,
      paying: 0,
      rewarded: 0,
      rewardedCents: 0,
      awaitingCredit: 0,
    },
    top,
    sources,
    recent,
  };
}
