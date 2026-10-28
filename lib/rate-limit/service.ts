import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { dateInZone, startOfDayIn } from "@/domain/calendar";
import type { Database } from "@/lib/db/database";
import { rateLimits } from "@/lib/db/schema/rate-limits";
import { timeZone } from "@/lib/i18n/locales";

/*
 * A fixed-window counter in Postgres. Each call adds one hit with a single upsert, so concurrent
 * calls from several replicas still count exactly once each, and the answer is the count the
 * database returned, never one read before the write.
 */

/**
 * How many hits a window allows. A window is a number of seconds counted from 1970 in UTC, or a day
 * of the product's time zone, from its midnight to the next: a daily allowance then starts again
 * when the person's day does, not at midnight UTC.
 */
export type RateLimit = {
  /** Names the limit, so two limits on the same subject never share a counter. */
  name: string;
  limit: number;
} & ({ windowSeconds: number } | { per: "day" });

export type RateDecision = { allowed: boolean; remaining: number; retryAfterSeconds: number };

const MS = 1000;

/** The window an instant falls in under a rule: when it started and when the next one starts. */
export function windowOf(rule: RateLimit, now: Date): { start: Date; end: Date } {
  if ("per" in rule) {
    const today = dateInZone(now, timeZone);
    const start = startOfDayIn(today, timeZone);
    // Noon of the next day is on the next date whatever the offset does in between.
    const tomorrow = dateInZone(new Date(start.getTime() + 36 * 3600 * MS), timeZone);
    return { start, end: startOfDayIn(tomorrow, timeZone) };
  }
  const windowMs = rule.windowSeconds * MS;
  const start = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  return { start, end: new Date(start.getTime() + windowMs) };
}

const keyOf = (name: string, subject: string, windowStart: Date) =>
  createHash("sha256").update(`${name}\n${subject}\n${windowStart.getTime()}`).digest("base64url");

export async function consume(
  db: Database,
  rule: RateLimit,
  subject: string,
  now: Date,
): Promise<RateDecision> {
  const { start: windowStart, end: expiresAt } = windowOf(rule, now);
  const [row] = await db
    .insert(rateLimits)
    .values({ key: keyOf(rule.name, subject, windowStart), hits: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { hits: sql`${rateLimits.hits} + 1` },
    })
    .returning({ hits: rateLimits.hits });
  const hits = row?.hits ?? 1;
  return {
    allowed: hits <= rule.limit,
    remaining: Math.max(0, rule.limit - hits),
    retryAfterSeconds: Math.ceil((expiresAt.getTime() - now.getTime()) / MS),
  };
}

/** How many hits the window `now` falls in has spent so far, without spending one. */
export async function spent(
  db: Database,
  rule: RateLimit,
  subject: string,
  now: Date,
): Promise<number> {
  const { start } = windowOf(rule, now);
  const [row] = await db
    .select({ hits: rateLimits.hits })
    .from(rateLimits)
    .where(eq(rateLimits.key, keyOf(rule.name, subject, start)));
  return row?.hits ?? 0;
}
