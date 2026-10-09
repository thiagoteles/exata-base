import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { type UserOptions, users } from "@/lib/db/schema/users";
import type { PreferenceKey, Preferences, PreferenceValue } from "./definitions";
import { parsePreference, resolvePreferences, savedPreference } from "./resolve";

/*
 * A person's preferences live in one jsonb column, so a new preference never needs a new column.
 * Each one is saved on its own, leaving the others untouched, and every read goes through the
 * registry, so what comes back is always valid.
 */

/** What is stored, as it is: for the code that decides about cookies. */
export async function readStoredOptions(db: Database, userId: string): Promise<UserOptions> {
  const [row] = await db.select({ options: users.options }).from(users).where(eq(users.id, userId));
  return row?.options ?? {};
}

export async function readPreferences(db: Database, userId: string): Promise<Preferences> {
  return resolvePreferences(await readStoredOptions(db, userId));
}

/** Validates against the registry and saves that one preference. A value that does not fit is a 400. */
export async function savePreference<K extends PreferenceKey>(
  db: Database,
  userId: string,
  key: K,
  value: unknown,
): Promise<PreferenceValue<K>> {
  const checked = parsePreference(key, value);
  await db
    .update(users)
    .set({
      options: sql`jsonb_set(${users.options}, array[${key}]::text[], ${JSON.stringify(checked)}::jsonb)`,
    })
    .where(eq(users.id, userId));
  return checked;
}

/** The language saved in the account of an e-mail address, or null (no account, or none chosen). */
export async function savedLocaleOfEmail(db: Database, email: string): Promise<string | null> {
  const [row] = await db
    .select({ options: users.options })
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  return row === undefined ? null : (savedPreference(row.options, "locale") ?? null);
}

/** The language saved by a person, or null. */
export async function savedLocaleOfUser(db: Database, userId: string): Promise<string | null> {
  return savedPreference(await readStoredOptions(db, userId), "locale") ?? null;
}
