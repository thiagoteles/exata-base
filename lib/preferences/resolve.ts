import {
  type PreferenceDefinition,
  type PreferenceKey,
  type Preferences,
  type PreferenceValue,
  preferenceKeys,
  preferences,
} from "./definitions";

/*
 * Reading what is stored, with no database. A stored value that is absent or no longer valid (an
 * option removed, a value from an older version) is the same as one never chosen: the fallback.
 */

export type Stored = Readonly<Record<string, unknown>>;
export type CookieChange = { name: string; value: string | null };

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

/** The cookie a value implies, or null for a preference the page does not need before it paints. */
export function cookieFor<K extends PreferenceKey>(
  key: K,
  value: PreferenceValue<K>,
): CookieChange | null {
  const { cookie } = preferences[key] as unknown as PreferenceDefinition<PreferenceValue<K>>;
  return cookie === undefined ? null : { name: cookie.name, value: cookie.value(value) };
}

/**
 * The cookies that carry what a person saved to a new browser. Only what they actually saved: a
 * preference they never chose leaves the browser's own cookie alone.
 */
export function cookiesForSaved(stored: Stored): CookieChange[] {
  return preferenceKeys.flatMap((key) => {
    const value = savedPreference(stored, key);
    const change = value === undefined ? null : cookieFor(key, value);
    return change === null ? [] : [change];
  });
}
