import { isTimeZone } from "@/domain/calendar";
import { defaultEmailPreferences, type EmailPreferences } from "@/domain/email/consent";
import { MAX_STEP_ID_LENGTH, MAX_STEPS } from "@/domain/onboarding/steps";
import { defaultLocale, LOCALE_COOKIE, locales, timeZone } from "@/lib/i18n/locales";
import {
  CONTRAST_COOKIE,
  FONT_SCALE_COOKIE,
  MOTION_COOKIE,
  THEME_COOKIE,
  themes,
} from "@/lib/theme";
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
  /**
   * Kept in the browser's own storage while the person is a visitor, and never in a cookie, which
   * rides every request and holds 4 KB: for what is too big for that, such as a draft. It is saved to
   * the account when they sign in (see `claimVisitorValues`). The schema is its size limit.
   */
  browser?: true;
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
  // How the page looks to someone who needs it different. Each sets an attribute on <html> before
  // the first paint (see lib/theme.ts); the default leaves it off and clears the cookie.
  fontScale: definePreference<"default" | "large" | "larger">({
    schema: z.enum(["default", "large", "larger"]),
    fallback: "default",
    cookie: {
      name: FONT_SCALE_COOKIE,
      encode: (value) => (value === "default" ? null : value),
      decode: (raw) => raw,
    },
  }),
  motion: definePreference<"system" | "reduce">({
    schema: z.enum(["system", "reduce"]),
    fallback: "system",
    cookie: {
      name: MOTION_COOKIE,
      encode: (value) => (value === "system" ? null : value),
      decode: (raw) => raw,
    },
  }),
  contrast: definePreference<"system" | "more">({
    schema: z.enum(["system", "more"]),
    fallback: "system",
    cookie: {
      name: CONTRAST_COOKIE,
      encode: (value) => (value === "system" ? null : value),
      decode: (raw) => raw,
    },
  }),
  // The message a visitor started writing in the contact form and did not send.
  contactDraft: definePreference<{ subject: string; body: string } | null>({
    schema: z.object({ subject: z.string().max(40), body: z.string().max(5000) }).nullable(),
    fallback: null,
    browser: true,
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
  // The first steps the person has finished. See `domain/onboarding/steps.ts`.
  onboarding: definePreference<string[]>({
    schema: z.array(z.string().min(1).max(MAX_STEP_ID_LENGTH)).max(MAX_STEPS),
    fallback: [],
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

/** The preferences a visitor keeps in the browser's own storage instead of a cookie. */
export const browserPreferenceKeys = preferenceKeys.filter(
  (key) => (preferences[key] as { browser?: true }).browser === true,
);
