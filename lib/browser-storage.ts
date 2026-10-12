import { browserPreferenceKeys } from "@/lib/preferences/definitions";

/*
 * What a visitor keeps in this browser: values the registry marks as `browser`, under a name of
 * their own, as JSON. Storage can be blocked (a private window, a setting), so every call is safe
 * to make and does nothing when it cannot work; a visitor then simply loses the draft on reload.
 */

const PREFIX = "visitor:";

export function readVisitorValue(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

export function writeVisitorValue(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Blocked or full: the value stays on screen and is not kept.
  }
}

export function clearVisitorValue(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Blocked: nothing was kept to forget.
  }
}

/** Everything this browser holds for a visitor, by key, for the account to claim. */
export function readAllVisitorValues(): Record<string, unknown> {
  const held: Record<string, unknown> = {};
  for (const key of browserPreferenceKeys) {
    const value = readVisitorValue(key);
    if (value !== undefined) {
      held[key] = value;
    }
  }
  return held;
}
