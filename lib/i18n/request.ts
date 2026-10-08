import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import messages from "@/messages/pt-BR.json";
import { defaultLocale, isLocale, isMultilingual, LOCALE_HEADER, timeZone } from "./locales";

/*
 * With a single language the request config is a constant: it never reads the request, so the
 * static shell stays static. With more than one, the proxy has already decided the language and
 * passes it in a header; reading it makes the page render per request.
 */
export default getRequestConfig(async () => {
  if (!isMultilingual) {
    return { locale: defaultLocale, timeZone, messages };
  }
  const requested = (await headers()).get(LOCALE_HEADER);
  const locale = isLocale(requested) ? requested : defaultLocale;
  const catalog = (await import(`../../messages/${locale}.json`)) as { default: typeof messages };
  return { locale, timeZone, messages: catalog.default };
});
