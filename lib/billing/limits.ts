import type { Holder, LimitName } from "@/domain/billing/entitlements";
import type { Database } from "@/lib/db/database";
import { consume, type RateDecision } from "@/lib/rate-limit/service";
import { entitlementsFor } from "./service";

/*
 * What a plan allows in a window, spent from the same counters the rate limits use. The catalog says
 * how much and for how long (`limits` of each tier); the counter is one per person and limit, so a
 * limit is shared by every place that spends it. A limit that the person's tier does not name is not
 * a limit: it always allows. The count is the one the database returned for the call, so concurrent
 * calls from several replicas spend exactly once each.
 */

const UNLIMITED: RateDecision = {
  allowed: true,
  remaining: Number.POSITIVE_INFINITY,
  retryAfterSeconds: 0,
};

/** Spends one use of a limit for a holder, under the plan they have at `now`. */
export async function consumeLimit(
  db: Database,
  holder: Holder,
  name: LimitName,
  now: Date,
): Promise<RateDecision> {
  const { limits } = await entitlementsFor(db, holder, now);
  const rule = limits[name];
  if (rule === undefined) {
    return UNLIMITED;
  }
  return consume(
    db,
    { name: `plan:${name}`, limit: rule.limit, windowSeconds: rule.windowSeconds },
    `user:${holder.id}`,
    now,
  );
}
