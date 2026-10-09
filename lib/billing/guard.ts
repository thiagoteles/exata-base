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

/**
 * The signed-in user when their plan grants the feature; otherwise a 401 or a 403. The guard for a page or a
 * route that is wholly paid; a screen that shows one thing or another uses `hasFeature`.
 *
 * @public
 */
export async function requireFeature(feature: Feature) {
  const user = await requireUser();
  await assertFeature(user.id, feature);
  return user;
}

/**
 * Whether the signed-in person's plan grants the feature, for a screen that shows one thing or
 * another instead of failing. It is the same guard, so what a screen shows and what a route allows
 * cannot disagree. Not signed in is still a 401: a visitor never reaches a gate.
 */
export async function hasFeature(feature: Feature): Promise<boolean> {
  try {
    await requireFeature(feature);
    return true;
  } catch (error) {
    if (error instanceof DomainError && error.status === 403) {
      return false;
    }
    throw error;
  }
}
