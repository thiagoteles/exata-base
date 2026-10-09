import type { Database } from "@/lib/db/database";
import { browserPreferenceKeys, type PreferenceKey, preferences } from "./definitions";
import { savedPreference } from "./resolve";
import { readStoredOptions, savePreference } from "./service";

/**
 * What a visitor kept in the browser, handed to the account they just signed in to. The account
 * wins: a value it already has is not replaced, because what a person saved before follows them and
 * a draft on a shared computer must not overwrite it. A value that does not fit the registry is
 * dropped. Either way the key is reported as handled, so the browser can forget it: the point is
 * that nothing stays behind on a machine the person may not own. Keys nobody declared are ignored.
 */
export async function claimVisitorValues(
  db: Database,
  userId: string,
  values: Readonly<Record<string, unknown>>,
): Promise<PreferenceKey[]> {
  const offered = browserPreferenceKeys.filter((key) => Object.hasOwn(values, key));
  const stored = await readStoredOptions(db, userId);
  for (const key of offered) {
    const fits = preferences[key].schema.safeParse(values[key]).success;
    if (fits && savedPreference(stored, key) === undefined) {
      // biome-ignore lint/performance/noAwaitInLoops: a few keys, saved one after the other
      await savePreference(db, userId, key, values[key]);
    }
  }
  return offered;
}
