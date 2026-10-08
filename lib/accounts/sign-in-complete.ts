import type { UserOptions } from "@/lib/db/schema/users";
import { isLocale, type Locale } from "@/lib/i18n/locales";
import { safeReturnPath } from "@/lib/routes";
import { isTheme, type Theme } from "@/lib/theme";

/**
 * Where a person lands after signing in, and the cookies that carry their saved theme and
 * language to the next request. The way back is accepted only if it stays on this site.
 */
export function afterSignIn(
  options: UserOptions,
  next: string | null | undefined,
): { location: string; theme: Theme | null; locale: Locale | null } {
  return {
    location: safeReturnPath(next),
    theme: isTheme(options.theme) ? options.theme : null,
    locale: isLocale(options.locale) ? options.locale : null,
  };
}
