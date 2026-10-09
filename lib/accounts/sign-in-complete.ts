import type { UserOptions } from "@/lib/db/schema/users";
import { type Carried, type CookieChange, carryAtSignIn } from "@/lib/preferences/resolve";
import { safeReturnPath } from "@/lib/routes";

/**
 * Where a person lands after signing in, the cookies that carry what they saved (theme, language,
 * whatever the registry holds) to this browser, and what this browser held that the account did not
 * yet, which is to be saved to it. The way back is accepted only if it stays on this site.
 */
export function afterSignIn(
  options: UserOptions,
  browser: Readonly<Record<string, string>>,
  next: string | null | undefined,
): { location: string; cookies: CookieChange[]; save: Carried[] } {
  return { location: safeReturnPath(next), ...carryAtSignIn(options, browser) };
}
