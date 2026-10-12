import { headers } from "next/headers";
import { currentInstant } from "@/domain/clock";
import { clientAddress } from "@/lib/client-address";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { consume, type RateLimit } from "./service";

/*
 * Rate limits at the edge of a request. A signed-in person is counted by their id; anyone else by
 * the address the trusted proxy wrote. A request whose address is unknown shares one counter, so a
 * misconfigured proxy fails closed instead of turning the limit off.
 */

export async function requestAddressSubject(): Promise<string> {
  return `address:${clientAddress(await headers(), env.TRUSTED_PROXY) ?? "unknown"}`;
}

/** Counts one hit and throws the 429 domain error when the subject went over the limit. */
export async function enforceRateLimit(rule: RateLimit, subject: string): Promise<void> {
  const decision = await consume(db, rule, subject, currentInstant());
  if (!decision.allowed) {
    throw new DomainError(429);
  }
}
