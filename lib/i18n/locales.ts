/*
 * The single list of locales. The proxy, the request config and the type declarations all read it.
 * Portuguese is the only language the product ships. To add one, create messages/<locale>.json
 * with exactly the keys of pt-BR and add the locale to this list; `pnpm check` compares the two.
 */
export const locales = ["pt-BR"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-BR";

export const timeZone = "America/Sao_Paulo";

/** More than one language switches on the language choice: the proxy, the prefix and the switcher. */
export const isMultilingual = locales.length > 1;

export const LOCALE_COOKIE = "NEXT_LOCALE";

/** The proxy tells the server which language a request is in through this header. */
export const LOCALE_HEADER = "x-app-locale";

const isLocale = (value: string | null | undefined): value is Locale =>
  locales.some((locale) => locale === value);

export { isLocale };

/** The address prefix of a language: its first subtag, so `en-US` lives under `/en`. */
export const localePrefix = (locale: Locale): string => locale.split("-")[0]?.toLowerCase() ?? "";
