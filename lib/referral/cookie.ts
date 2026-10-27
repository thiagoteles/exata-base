import { referralSettings } from "@/domain/referral/settings.product";

/** The cookie that remembers which inviter's link a visitor arrived by, until they sign up. */
export const REFERRAL_COOKIE = "ref";

const DAY_SECONDS = 86_400;

/** Set when a visitor opens a link with `?ref=`. Not readable by scripts: only the server weighs it. */
export const referralCookieOptions = {
  path: "/",
  maxAge: referralSettings.cookieDays * DAY_SECONDS,
  sameSite: "lax",
  httpOnly: true,
} as const;
