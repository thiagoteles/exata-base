import { and, count, eq, inArray, isNull, ne, sql, sum } from "drizzle-orm";
import { type Tier, tierNames } from "@/domain/billing/entitlements";
import { dateInSaoPaulo, type IsoDate } from "@/lib/date";
import type { Database } from "@/lib/db/database";
import { payments, plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import { timeZone } from "@/lib/i18n/locales";
import { type AdminViewer, assertAdmin } from "./guard";

/*
 * The business numbers, read from the database alone, so they never wait on an analytics service
 * and always agree with the records. Days are counted in the product's time zone, and every day of
 * the range is present, zero included, so a chart never skips a quiet day. Revenue is net of
 * refunds and in reais; a payment in another currency is left out until prices have currencies.
 */

export const rangeDays = [7, 30, 90] as const;
export type RangeDays = (typeof rangeDays)[number];

export type DayValue = { day: IsoDate; value: number };

export type BusinessNumbers = {
  signups: DayValue[];
  revenueCents: DayValue[];
  refundedCents: number;
  payersByTier: { tier: Tier; count: number }[];
  courtesies: number;
  scheduledCancellations: number;
};

const DAY_MS = 86_400_000;

function daysBack(today: IsoDate, range: RangeDays): IsoDate[] {
  const end = Date.parse(`${today}T12:00:00Z`);
  return Array.from(
    { length: range },
    (_, index) =>
      new Date(end - (range - 1 - index) * DAY_MS).toISOString().slice(0, 10) as IsoDate,
  );
}

const fill = (days: readonly IsoDate[], rows: { day: string; value: number }[]): DayValue[] => {
  const byDay = new Map(rows.map((row) => [row.day, row.value]));
  return days.map((day) => ({ day, value: byDay.get(day) ?? 0 }));
};

// Grouped by position: the time zone is a parameter, and two parameters never match as one expression.
const localDay = (column: typeof users.createdAt | typeof payments.paidAt) =>
  sql<string>`to_char(${column} at time zone ${timeZone}, 'YYYY-MM-DD')`;

const live = inArray(plans.status, ["active", "past_due", "trialing"]);

export async function readBusinessNumbers(
  db: Database,
  viewer: AdminViewer,
  range: RangeDays,
  now: Date,
): Promise<BusinessNumbers> {
  assertAdmin(viewer);
  const days = daysBack(dateInSaoPaulo(now), range);
  const fromDay = sql`${days[0]}::date`;

  const [signups, revenue, refunded, tiers, courtesies, cancellations] = await Promise.all([
    db
      .select({ day: localDay(users.createdAt), value: count() })
      .from(users)
      .where(sql`(${users.createdAt} at time zone ${timeZone})::date >= ${fromDay}`)
      .groupBy(sql`1`),
    db
      .select({
        day: localDay(payments.paidAt),
        value: sql<number>`sum(${payments.amountCents} - ${payments.refundedCents})::int`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.currency, "brl"),
          sql`(${payments.paidAt} at time zone ${timeZone})::date >= ${fromDay}`,
        ),
      )
      .groupBy(sql`1`),
    db
      .select({ value: sum(payments.refundedCents).mapWith(Number) })
      .from(payments)
      .where(
        and(
          eq(payments.currency, "brl"),
          sql`(${payments.paidAt} at time zone ${timeZone})::date >= ${fromDay}`,
        ),
      ),
    db
      .select({ tier: plans.tier, value: count() })
      .from(plans)
      .where(and(ne(plans.tier, "free"), live, isNull(plans.courtesyReason)))
      .groupBy(plans.tier),
    db
      .select({ value: count() })
      .from(plans)
      .where(and(ne(plans.tier, "free"), live, sql`${plans.courtesyReason} is not null`)),
    db
      .select({ value: count() })
      .from(plans)
      .where(and(ne(plans.tier, "free"), live, eq(plans.cancelAtPeriodEnd, true))),
  ]);

  const tierCounts = new Map(tiers.map((row) => [row.tier, row.value]));
  return {
    signups: fill(days, signups),
    revenueCents: fill(days, revenue),
    refundedCents: refunded[0]?.value ?? 0,
    payersByTier: tierNames
      .filter((tier) => tier !== "free")
      .map((tier) => ({ tier, count: tierCounts.get(tier) ?? 0 })),
    courtesies: courtesies[0]?.value ?? 0,
    scheduledCancellations: cancellations[0]?.value ?? 0,
  };
}
