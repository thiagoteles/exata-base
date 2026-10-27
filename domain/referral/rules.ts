/*
 * Who may count as invited by whom. A person arrives through a link that carries the inviter's code;
 * when they sign up, the code is weighed against these rules. Nothing here reads the database or the
 * clock: the caller says who the people are and what moment it is.
 */

import { referralSettings } from "./settings.product";

/** A code is twelve lowercase letters and digits, the same shape the database generates. */
const REFERRAL_CODE = /^[a-z0-9]{12}$/;

/** A person counts as invited only if they signed up this recently after arriving by the link. */
export const ATTRIBUTION_WINDOW_DAYS = referralSettings.windowDays;

const DAY_MS = 86_400_000;

/** The code in a link or a cookie, in lower case, or null when it is not one. */
export function readReferralCode(raw: string | null | undefined): string | null {
  const code = raw?.trim().toLowerCase();
  return code !== undefined && REFERRAL_CODE.test(code) ? code : null;
}

/** Where a link says it was shared from, when the product lists that place, or null. */
export function readReferralSource(
  raw: string | null | undefined,
  sources: readonly string[] = referralSettings.sources,
): string | null {
  const source = raw?.trim().toLowerCase();
  return source !== undefined && sources.includes(source) ? source : null;
}

/** What the cookie keeps: the code, and the place the link came from when it named one. */
export const referralCookieValue = (code: string, source: string | null): string =>
  source === null ? code : `${code}:${source}`;

/** The code and the place back out of the cookie, each checked again: a visitor can edit it. */
export function readReferralCookie(
  raw: string | null | undefined,
  sources: readonly string[] = referralSettings.sources,
): { code: string; source: string | null } | null {
  const [code, source] = (raw ?? "").split(":", 2);
  const read = readReferralCode(code);
  return read === null ? null : { code: read, source: readReferralSource(source, sources) };
}

export type ReferralVerdict =
  | "counts"
  | "unknown_code"
  | "own_code"
  | "already_invited"
  | "too_late";

type Moment = {
  /** Who owns the code, or null when no account has it. */
  referrerId: string | null;
  referredId: string;
  referredCreatedAt: Date;
  alreadyInvited: boolean;
  now: Date;
  /** How many days after signing up a sign-in still counts; the product's setting unless given. */
  windowDays?: number;
};

export function referralVerdict({
  referrerId,
  referredId,
  referredCreatedAt,
  alreadyInvited,
  now,
  windowDays = ATTRIBUTION_WINDOW_DAYS,
}: Moment): ReferralVerdict {
  if (referrerId === null) {
    return "unknown_code";
  }
  if (referrerId === referredId) {
    return "own_code";
  }
  if (alreadyInvited) {
    return "already_invited";
  }
  // An account that is old is not a new arrival: someone who signed in through a link years after
  // signing up was not brought by it.
  return now.getTime() - referredCreatedAt.getTime() > windowDays * DAY_MS ? "too_late" : "counts";
}
