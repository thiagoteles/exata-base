import type { RateLimit } from "./service";

/*
 * Which credential checks are limited, and by what. The counters themselves live beside the
 * database; this file stays free of it so the rules can be tested on their own.
 */

export const signInAttempts: RateLimit = { name: "sign-in", limit: 10, windowSeconds: 15 * 60 };

export const passwordResetAttempts: RateLimit = {
  name: "password-reset",
  limit: 5,
  windowSeconds: 60 * 60,
};

export const secondFactorAttempts: RateLimit = {
  name: "second-factor",
  limit: 5,
  windowSeconds: 15 * 60,
};

/** The subjects one attempt spends. An empty e-mail counts only the address. */
export function credentialSubjects(address: string, email: string | undefined): string[] {
  const normalized = email?.trim().toLowerCase() ?? "";
  return normalized === "" ? [address] : [address, `email:${normalized}`];
}

/** The auth API paths that check a password or a second factor, and the limit each one spends. */
export function credentialAttemptFor(pathname: string): RateLimit | null {
  if (pathname.endsWith("/sign-in/email")) {
    return signInAttempts;
  }
  if (pathname.endsWith("/request-password-reset")) {
    return passwordResetAttempts;
  }
  if (
    pathname.endsWith("/two-factor/verify-totp") ||
    pathname.endsWith("/two-factor/verify-backup-code")
  ) {
    return secondFactorAttempts;
  }
  return null;
}
