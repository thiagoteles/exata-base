import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { REMINDER_WINDOW_DAYS } from "@/domain/billing/abandonment";
import { sendAbandonedCheckout } from "@/lib/billing/mailer";
import type { Database } from "@/lib/db/database";
import { checkoutSessions, plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import { chooseLocale } from "@/lib/ports/email/locale";
import { resolvePreferences } from "@/lib/preferences/resolve";
import type { ScheduledOperation } from "./run";

const DAY_MS = 86_400_000;

type Outcome = "sent" | "declined" | "failed" | "skipped";

/** Reminds one person once, and gives their claims back when the e-mail did not go out. */
async function remind(
  db: Database,
  userId: string,
  sessionIds: readonly string[],
): Promise<Outcome> {
  const [person] = await db.select().from(users).where(eq(users.id, userId));
  if (person === undefined) {
    return "skipped";
  }
  const { locale } = resolvePreferences(person.options);
  const result = await sendAbandonedCheckout({
    to: person.email,
    name: person.name,
    locale: chooseLocale(locale, locale),
  });
  if (result === "failed") {
    await db
      .update(checkoutSessions)
      .set({ abandonedEmailAt: null })
      .where(inArray(checkoutSessions.id, [...sessionIds]));
  }
  return result;
}

/**
 * Sends one reminder, once, to a person whose checkout expired unpaid in the last week and who has
 * no paid plan since. The sessions are claimed first, in one update, and then the e-mail goes out: two
 * runs at once cannot both send, and a person with several expired sessions gets one message. A person
 * who turned reminders off is declined by the e-mail port, and that is the end of it, not a retry.
 */
export const remindAbandonedCheckouts: ScheduledOperation = {
  cadence: "daily",
  name: "remind-abandoned-checkouts",
  async run({ db, now }) {
    const since = new Date(now.getTime() - REMINDER_WINDOW_DAYS * DAY_MS);
    const claimed = await db
      .update(checkoutSessions)
      .set({ abandonedEmailAt: now })
      .where(
        and(
          eq(checkoutSessions.status, "expired"),
          isNull(checkoutSessions.abandonedEmailAt),
          gte(checkoutSessions.closedAt, since),
          lte(checkoutSessions.closedAt, now),
          // Someone who bought another way since has nothing to be reminded of.
          inArray(
            checkoutSessions.userId,
            db.select({ id: plans.userId }).from(plans).where(eq(plans.tier, "free")),
          ),
        ),
      )
      .returning({ id: checkoutSessions.id, userId: checkoutSessions.userId });
    const byPerson = new Map<string, string[]>();
    for (const { id, userId } of claimed) {
      byPerson.set(userId, [...(byPerson.get(userId) ?? []), id]);
    }
    const counts = { sent: 0, declined: 0, failed: 0 };
    for (const [userId, sessionIds] of byPerson) {
      // One message at a time, so a slow provider is not hit with a burst.
      // biome-ignore lint/performance/noAwaitInLoops: sequential on purpose
      const outcome = await remind(db, userId, sessionIds);
      if (outcome !== "skipped") {
        counts[outcome] += 1;
      }
    }
    return counts;
  },
};
