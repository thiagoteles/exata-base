/*
 * The single list of locales. The proxy, the request config and the type declarations all read it.
 * Portuguese is the only language the product ships. To add one, create messages/<locale>/ with
 * the same area files and keys as pt-BR, add the locale to this list and to `localeStatus`; `pnpm check`
 * compares the two.
 */
export const locales = ["pt-BR"] as const;

export type Locale = (typeof locales)[number];

/*
 * Whether a language has every sentence. A language that is not complete may miss keys: the missing
 * ones are shown in the default language (see `lib/i18n/fallback.ts`), `pnpm check` reports how much
 * is left instead of failing, and the language can ship while it is being translated. A key that the
 * default language does not have, or one whose arguments differ, is still an error. Every language on
 * the list needs an entry, which the type enforces.
 */
const localeStatus = {
  "pt-BR": { complete: true },
} as const satisfies Record<Locale, { complete: boolean }>;

export const isComplete = (locale: Locale): boolean => localeStatus[locale].complete;

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
export const localePrefix = (locale: string): string => locale.split("-")[0]?.toLowerCase() ?? "";
