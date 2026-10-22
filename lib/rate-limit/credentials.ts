import { currentInstant } from "@/domain/clock";
import { db } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { credentialAttemptFor, credentialSubjects } from "./credential-rules";
import { requestAddressSubject } from "./guard";
import { consume, type RateLimit } from "./service";

/*
 * Password checks are counted twice: once for the address, once for the e-mail that was typed.
 * Either counter refusing stops the attempt. The e-mail is only hashed into the counter key, and
 * a wrong password and a missing account still look the same to the caller.
 */

/** Counts one credential attempt and throws 429 when the address or the e-mail is over its limit. */
export async function enforceCredentialAttempt(
  rule: RateLimit,
  email: string | undefined,
): Promise<void> {
  const subjects = credentialSubjects(await requestAddressSubject(), email);
  const now = currentInstant();
  const decisions = await Promise.all(subjects.map((subject) => consume(db, rule, subject, now)));
  if (decisions.some((decision) => !decision.allowed)) {
    throw new DomainError(429);
  }
}

/**
 * Spends the limit for a local auth request before the handler reads it. The body is cloned, so
 * the handler still receives it. A body that is not JSON counts only the address.
 */
export async function limitCredentialRequest(request: Request): Promise<void> {
  if (request.method !== "POST") {
    return;
  }
  const rule = credentialAttemptFor(new URL(request.url).pathname);
  if (rule === null) {
    return;
  }
  let email: string | undefined;
  try {
    const body = (await request.clone().json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email : undefined;
  } catch {
    email = undefined;
  }
  await enforceCredentialAttempt(rule, email);
}
