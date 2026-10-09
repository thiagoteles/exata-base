import type { UserOptions } from "@/lib/db/schema/users";
import { type CookieChange, cookiesForSaved } from "@/lib/preferences/resolve";
import { safeReturnPath } from "@/lib/routes";

/**
 * Where a person lands after signing in, and the cookies that carry what they saved (theme,
 * language, whatever the registry marks) to the next request. The way back is accepted only if it
 * stays on this site.
 */
export function afterSignIn(
  options: UserOptions,
  next: string | null | undefined,
): { location: string; cookies: CookieChange[] } {
  return { location: safeReturnPath(next), cookies: cookiesForSaved(options) };
}
