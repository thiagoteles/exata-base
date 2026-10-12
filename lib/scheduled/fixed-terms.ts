import { and, eq, gt, isNotNull, isNull, lte } from "drizzle-orm";
import { EXPIRY_WARNING_DAYS, fixedTermIntervals } from "@/domain/billing/term";
import { sendPlanExpiring } from "@/lib/billing/mailer";
import { freePlan } from "@/lib/billing/service";
import { formatInstantDate } from "@/lib/date";
import type { Database } from "@/lib/db/database";
import { plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import { chooseLocale } from "@/lib/ports/email/locale";
import { resolvePreferences } from "@/lib/preferences/resolve";
import type { ScheduledOperation } from "./run";

const DAY_MS = 86_400_000;
const fixedTerm = fixedTermIntervals.map((interval) => eq(plans.billingInterval, interval));

/**
 * Takes a plan bought for a year back to free once its year is over. Access already stops at the
 * end instant (the plan rules read it), so this only makes the record say so. Running it twice in
 * a row changes nothing the second time, because what it changed no longer matches.
 */
export const expireFixedTerms: ScheduledOperation = {
  cadence: "daily",
  name: "expire-fixed-terms",
  async run({ db, now }) {
    const [first] = fixedTerm;
    if (first === undefined) {
      return { expired: 0 };
    }
    const expired = await db
      .update(plans)
      .set(freePlan)
      .where(and(first, isNotNull(plans.currentPeriodEnd), lte(plans.currentPeriodEnd, now)))
      .returning({ userId: plans.userId });
    return { expired: expired.length };
  },
};

type Claim = { userId: string; endsAt: Date | null };

/** Sends the warning for one claimed plan, and gives the claim back when the e-mail did not go out. */
async function warnOne(db: Database, claim: Claim): Promise<"warned" | "failed" | "skipped"> {
  const [person] = await db.select().from(users).where(eq(users.id, claim.userId));
  if (person === undefined || claim.endsAt === null) {
    return "skipped";
  }
  const { timeZone, locale } = resolvePreferences(person.options);
  const sent = await sendPlanExpiring({
    to: person.email,
    name: person.name,
    endsOn: formatInstantDate(claim.endsAt, timeZone),
    locale: chooseLocale(locale, locale),
  });
  if (sent) {
    return "warned";
  }
  await db.update(plans).set({ expiryWarnedAt: null }).where(eq(plans.userId, claim.userId));
  return "failed";
}

/**
 * Warns by e-mail, once, a person whose year ends within a week. The warning is claimed first, in
 * one update, and then sent: two runs at once cannot both send, and a send that fails gives the claim
 * back so the next run tries again.
 */
export const warnExpiringTerms: ScheduledOperation = {
  cadence: "daily",
  name: "warn-expiring-terms",
  async run({ db, now }) {
    const [first] = fixedTerm;
    if (first === undefined) {
      return { warned: 0, failed: 0 };
    }
    const soon = new Date(now.getTime() + EXPIRY_WARNING_DAYS * DAY_MS);
    const claimed = await db
      .update(plans)
      .set({ expiryWarnedAt: now })
      .where(
        and(
          first,
          isNull(plans.expiryWarnedAt),
          gt(plans.currentPeriodEnd, now),
          lte(plans.currentPeriodEnd, soon),
        ),
      )
      .returning({ userId: plans.userId, endsAt: plans.currentPeriodEnd });
    let warned = 0;
    let failed = 0;
    for (const claim of claimed) {
      // One message at a time, so a slow provider is not hit with a burst.
      // biome-ignore lint/performance/noAwaitInLoops: sequential on purpose
      const outcome = await warnOne(db, claim);
      warned += outcome === "warned" ? 1 : 0;
      failed += outcome === "failed" ? 1 : 0;
    }
    return { warned, failed };
  },
};
