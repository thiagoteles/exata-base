import { isTimeZone } from "@/domain/calendar";
import { defaultEmailPreferences, type EmailPreferences } from "@/domain/email/consent";
import { defaultLocale, LOCALE_COOKIE, locales, timeZone } from "@/lib/i18n/locales";
import { THEME_COOKIE, themes } from "@/lib/theme";
import { z } from "@/lib/validation";

/*
 * Every preference a person can save, in one place. Each declares what is valid (zod) and what
 * applies until they choose (the fallback, also used when a saved value no longer parses). A
 * product adds its own here, and nothing else changes: not a column, not an action, not a migration.
 *
 * Every preference travels in a cookie, which is how a visitor with no account keeps it, how the
 * first paint can read it before any code runs, and how it reaches the account at sign-in. The
 * cookie is `pref-<key>` with the value as JSON unless something else already reads one under its
 * own name and shape (the theme script, the proxy), which the definition then declares.
 */

export type PreferenceDefinition<T> = {
  schema: z.ZodType<T>;
  fallback: T;
  /** A cookie that something other than the registry reads. `encode` returning null clears it. */
  cookie?: { name: string; encode: (value: T) => string | null; decode: (raw: string) => unknown };
};

const definePreference = <T>(definition: PreferenceDefinition<T>): PreferenceDefinition<T> =>
  definition;

export const preferences = {
  theme: definePreference<"light" | "dark" | "system">({
    schema: z.enum([...themes, "system"]),
    fallback: "system",
    cookie: {
      name: THEME_COOKIE,
      encode: (value) => (value === "system" ? null : value),
      decode: (raw) => raw,
    },
  }),
  // Reported by the browser at sign-in and when it changes; a person who travels follows the clock.
  timeZone: definePreference<string>({
    schema: z.string().refine(isTimeZone),
    fallback: timeZone,
  }),
  // What may be e-mailed beyond what the account needs. See `domain/email/consent.ts`.
  email: definePreference<EmailPreferences>({
    schema: z.object({ reminders: z.boolean(), news: z.boolean() }).strict(),
    fallback: defaultEmailPreferences,
  }),
  locale: definePreference<(typeof locales)[number]>({
    schema: z.enum(locales),
    fallback: defaultLocale,
    cookie: { name: LOCALE_COOKIE, encode: (value) => value, decode: (raw) => raw },
  }),
};

export type PreferenceKey = keyof typeof preferences;
export type PreferenceValue<K extends PreferenceKey> = z.output<(typeof preferences)[K]["schema"]>;
export type Preferences = { [K in PreferenceKey]: PreferenceValue<K> };

export const preferenceKeys = Object.keys(preferences) as [PreferenceKey, ...PreferenceKey[]];
