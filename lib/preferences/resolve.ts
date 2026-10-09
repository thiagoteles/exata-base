import { DomainError } from "@/lib/errors";
import {
  type PreferenceKey,
  type Preferences,
  type PreferenceValue,
  preferenceKeys,
  preferences,
} from "./definitions";

/*
 * Reading what is stored or carried, with no database. A value that is absent or no longer valid
 * (an option removed, a value from an older version, a cookie edited by hand) is the same as one
 * never chosen: the fallback.
 */

export type Stored = Readonly<Record<string, unknown>>;
export type CookieChange = { name: string; value: string | null };
export type Carried = { key: PreferenceKey; value: unknown };

export type CookieSpec = {
  name: string;
  encode: (value: unknown) => string | null;
  decode: (raw: string) => unknown;
};

function decodeJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/** The cookie a preference travels in: the one it declares, or `pref-<key>` holding JSON. */
export function specFor(key: string, declared: CookieSpec | undefined): CookieSpec {
  return (
    declared ?? {
      name: `pref-${key}`,
      encode: (value) => JSON.stringify(value),
      decode: decodeJson,
    }
  );
}

const cookieSpec = (key: PreferenceKey): CookieSpec =>
  specFor(key, (preferences[key] as { cookie?: CookieSpec }).cookie);

/** The saved value of one preference, or undefined when none was saved or it does not parse. */
export function savedPreference<K extends PreferenceKey>(
  stored: Stored,
  key: K,
): PreferenceValue<K> | undefined {
  const parsed = preferences[key].schema.safeParse(
    Object.hasOwn(stored, key) ? stored[key] : undefined,
  );
  return parsed.success ? (parsed.data as PreferenceValue<K>) : undefined;
}

/** Every preference, each the saved value or its fallback. */
export function resolvePreferences(stored: Stored): Preferences {
  return Object.fromEntries(
    preferenceKeys.map((key) => [key, savedPreference(stored, key) ?? preferences[key].fallback]),
  ) as Preferences;
}

/** A value from outside, checked against the registry. One that does not fit is a 400. */
export function parsePreference<K extends PreferenceKey>(
  key: K,
  value: unknown,
): PreferenceValue<K> {
  const parsed = preferences[key].schema.safeParse(value);
  if (!parsed.success) {
    throw new DomainError(400);
  }
  return parsed.data as PreferenceValue<K>;
}

const isBrowserOnly = (key: PreferenceKey) =>
  (preferences[key] as { browser?: true }).browser === true;

/**
 * The cookie that carries a value: set, or cleared when the value is the one the page assumes.
 * A preference kept in the browser's own storage has none.
 */
export function cookieFor<K extends PreferenceKey>(
  key: K,
  value: PreferenceValue<K>,
): CookieChange | null {
  if (isBrowserOnly(key)) {
    return null;
  }
  const spec = cookieSpec(key);
  return { name: spec.name, value: spec.encode(value) };
}

/**
 * What signing in does with preferences. What the person saved wins and goes to the browser as
 * cookies, so a new browser looks like the old one. What they never saved but this browser already
 * holds (a visitor's choices before the account existed) is to be saved to the account.
 */
export function carryAtSignIn(
  stored: Stored,
  browser: Readonly<Record<string, string>>,
): { save: Carried[]; cookies: CookieChange[] } {
  const save: Carried[] = [];
  const cookies: CookieChange[] = [];
  // What is kept in the browser's own storage has no cookie to carry either way; the page claims it.
  for (const key of preferenceKeys.filter((candidate) => !isBrowserOnly(candidate))) {
    const saved = savedPreference(stored, key);
    const spec = cookieSpec(key);
    const raw = Object.hasOwn(browser, spec.name) ? browser[spec.name] : undefined;
    const held =
      raw === undefined ? undefined : preferences[key].schema.safeParse(spec.decode(raw));
    const change = saved === undefined ? null : cookieFor(key, saved);
    if (change !== null) {
      cookies.push(change);
    } else if (saved === undefined && held?.success) {
      save.push({ key, value: held.data });
    }
  }
  return { save, cookies };
}
