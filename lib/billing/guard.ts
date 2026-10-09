import { connection } from "next/server";
import type { Feature } from "@/domain/billing/entitlements";
import { currentInstant } from "@/domain/clock";
import { db } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { requireUser } from "@/lib/ports/auth";
import { entitlementsFor } from "./service";

/*
 * The plan guard for pages and routes. A page that shows paid content calls it the same way it
 * calls the role guard; an action passes `feature` to actionFor instead.
 */

/** Throws the 403 `paidPlanRequired` unless the holder's plan grants the feature. */
export async function assertFeature(holderId: string, feature: Feature): Promise<void> {
  // The plan depends on the clock, so this is request time: without it a page that guards by plan
  // logs "unstable value new Date()" on every visit in development.
  await connection();
  const granted = await entitlementsFor(db, { kind: "user", id: holderId }, currentInstant());
  if (!granted.features.has(feature)) {
    throw new DomainError(403, "paidPlanRequired");
  }
}

/** The signed-in user when their plan grants the feature; otherwise a 401 or a 403. */
export async function requireFeature(feature: Feature) {
  const user = await requireUser();
  await assertFeature(user.id, feature);
  return user;
}
