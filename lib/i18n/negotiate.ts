import { defaultLocale, isLocale, type Locale, localePrefix, locales } from "./locales";

/*
 * Which language a request is in, and which address it is really for. The order is the prefix in
 * the address, then the saved choice (the cookie), then the browser's Accept-Language, then the
 * default. The default language never has a prefix: it lives at the clean address.
 */

export type Negotiation = {
  locale: Locale;
  /** The address without any language prefix: what the routes are written for. */
  pathname: string;
  /** Where to send the browser first, when the address does not match the language. */
  redirectTo: string | null;
};

type Input = {
  pathname: string;
  cookie: string | undefined;
  acceptLanguage: string | null;
  /** Only a page load is redirected; anything else is answered where it was asked. */
  canRedirect: boolean;
};

function prefixedLocale(pathname: string): { locale: Locale; rest: string } | null {
  const [, first = "", ...others] = pathname.split("/");
  const locale = locales.find(
    (candidate) => candidate !== defaultLocale && localePrefix(candidate) === first.toLowerCase(),
  );
  return locale === undefined ? null : { locale, rest: `/${others.join("/")}` };
}

/** The best supported language for an Accept-Language header, or null. */
export function fromAcceptLanguage(header: string | null): Locale | null {
  if (header === null) {
    return null;
  }
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag = "", ...parameters] = part.trim().split(";");
      const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
      return {
        tag: tag.trim().toLowerCase(),
        weight: quality ? Number(quality.trim().slice(2)) : 1,
      };
    })
    .filter((entry) => entry.tag !== "" && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  for (const { tag } of wanted) {
    const exact = locales.find((locale) => locale.toLowerCase() === tag);
    const sameLanguage = locales.find((locale) => localePrefix(locale) === tag.split("-")[0]);
    const found = exact ?? sameLanguage;
    if (found !== undefined) {
      return found;
    }
  }
  return null;
}

export function negotiate({ pathname, cookie, acceptLanguage, canRedirect }: Input): Negotiation {
  const prefixed = prefixedLocale(pathname);
  if (prefixed !== null) {
    return { locale: prefixed.locale, pathname: prefixed.rest, redirectTo: null };
  }
  const chosen = isLocale(cookie) ? cookie : (fromAcceptLanguage(acceptLanguage) ?? defaultLocale);
  if (chosen !== defaultLocale && canRedirect) {
    const prefix = `/${localePrefix(chosen)}`;
    return {
      locale: chosen,
      pathname,
      redirectTo: pathname === "/" ? prefix : `${prefix}${pathname}`,
    };
  }
  return { locale: chosen, pathname, redirectTo: null };
}

/** An address with its language prefix removed, for code that compares it with route paths. */
export function stripLocalePrefix(pathname: string): string {
  return prefixedLocale(pathname)?.rest ?? pathname;
}

/** The address of `pathname` (clean) in a language: the default one has no prefix. */
export function pathInLocale(pathname: string, locale: string): string {
  if (locale === defaultLocale) {
    return pathname;
  }
  const prefix = `/${localePrefix(locale)}`;
  return pathname === "/" ? prefix : `${prefix}${pathname}`;
}
