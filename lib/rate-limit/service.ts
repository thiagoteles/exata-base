import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { rateLimits } from "@/lib/db/schema/rate-limits";

/*
 * A fixed-window counter in Postgres. Each call adds one hit with a single upsert, so concurrent
 * calls from several replicas still count exactly once each, and the answer is the count the
 * database returned, never one read before the write.
 */

export type RateLimit = {
  /** Names the limit, so two limits on the same subject never share a counter. */
  name: string;
  limit: number;
  windowSeconds: number;
};

export type RateDecision = { allowed: boolean; remaining: number; retryAfterSeconds: number };

const MS = 1000;

const keyOf = (name: string, subject: string, windowStart: Date) =>
  createHash("sha256").update(`${name}\n${subject}\n${windowStart.getTime()}`).digest("base64url");

export async function consume(
  db: Database,
  rule: RateLimit,
  subject: string,
  now: Date,
): Promise<RateDecision> {
  const windowMs = rule.windowSeconds * MS;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);
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
