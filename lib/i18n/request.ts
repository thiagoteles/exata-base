import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import messages from "@/messages/pt-BR.json";
import { withFallback } from "./fallback";
import {
  defaultLocale,
  isComplete,
  isLocale,
  isMultilingual,
  LOCALE_HEADER,
  type Locale,
  timeZone,
} from "./locales";

/*
 * With a single language the request config is a constant: it never reads the request, so the
 * static shell stays static. With more than one, the proxy has already decided the language and
 * passes it in a header; reading it makes the page render per request. A language that is not
 * complete is merged over the default once and kept, so a missing sentence shows in the default.
 */

const merged = new Map<Locale, typeof messages>();

async function catalogOf(locale: Locale): Promise<typeof messages> {
  const cached = merged.get(locale);
  if (cached !== undefined) {
    return cached;
  }
  const loaded = (await import(`../../messages/${locale}.json`)) as { default: typeof messages };
  const catalog = isComplete(locale) ? loaded.default : withFallback(messages, loaded.default);
  merged.set(locale, catalog);
  return catalog;
}

export default getRequestConfig(async () => {
  if (!isMultilingual) {
    return { locale: defaultLocale, timeZone, messages };
  }
  const requested = (await headers()).get(LOCALE_HEADER);
  const locale = isLocale(requested) ? requested : defaultLocale;
  return { locale, timeZone, messages: await catalogOf(locale) };
});
