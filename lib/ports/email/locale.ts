import { headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_HEADER, type Locale } from "@/lib/i18n/locales";

/** The language of the request being served, or the default outside a request. */
export async function requestLocale(): Promise<Locale> {
  try {
    const requested = (await headers()).get(LOCALE_HEADER);
    return isLocale(requested) ? requested : defaultLocale;
  } catch {
    // Outside a request (a script, a test) there is no header to read.
    return defaultLocale;
  }
}

/**
 * The language an e-mail goes out in: what the recipient saved in their account, else what they
 * were using when the message was caused, else the default.
 */
export function chooseLocale(saved: string | null | undefined, fallback: Locale): Locale {
  return isLocale(saved) ? saved : fallback;
}
