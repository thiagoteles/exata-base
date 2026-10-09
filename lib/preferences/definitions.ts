import { defaultLocale, LOCALE_COOKIE, locales } from "@/lib/i18n/locales";
import { THEME_COOKIE, themes } from "@/lib/theme";
import { z } from "@/lib/validation";

/*
 * Every preference a person can save, in one place. Each declares what is valid (zod), what applies
 * until they choose (the fallback, also used when a saved value no longer parses) and, when the page
 * needs it before any code runs, the cookie that carries it. A product adds its own here, and
 * nothing else changes: not a column, not an action, not a migration.
 */

export type PreferenceDefinition<T> = {
  schema: z.ZodType<T>;
  fallback: T;
  /** The cookie that carries the value to the first paint or the proxy. A null value clears it. */
  cookie?: { name: string; value: (value: T) => string | null };
};

const definePreference = <T>(definition: PreferenceDefinition<T>): PreferenceDefinition<T> =>
  definition;

export const preferences = {
  theme: definePreference<"light" | "dark" | "system">({
    schema: z.enum([...themes, "system"]),
    fallback: "system",
    cookie: { name: THEME_COOKIE, value: (value) => (value === "system" ? null : value) },
  }),
  locale: definePreference<(typeof locales)[number]>({
    schema: z.enum(locales),
    fallback: defaultLocale,
    cookie: { name: LOCALE_COOKIE, value: (value) => value },
  }),
};

export type PreferenceKey = keyof typeof preferences;
export type PreferenceValue<K extends PreferenceKey> = z.output<(typeof preferences)[K]["schema"]>;
export type Preferences = { [K in PreferenceKey]: PreferenceValue<K> };

export const preferenceKeys = Object.keys(preferences) as [PreferenceKey, ...PreferenceKey[]];
