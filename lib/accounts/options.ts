import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { type UserOptions, users } from "@/lib/db/schema/users";
import type { Locale } from "@/lib/i18n/locales";
import type { Theme } from "@/lib/theme";

/*
 * A person's preferences live in one jsonb column, so a new option never needs a new column.
 * Each option is changed on its own, leaving the others untouched. A preference that must be known
 * before the first paint (the theme) is also copied to a cookie by whoever changes it.
 */

export async function readOptions(db: Database, userId: string): Promise<UserOptions> {
  const [row] = await db.select({ options: users.options }).from(users).where(eq(users.id, userId));
  return row?.options ?? {};
}

/** Saves the theme, or forgets it with null so the system setting applies again. */
export async function saveTheme(db: Database, userId: string, theme: Theme | null): Promise<void> {
  const next =
    theme === null
      ? sql`${users.options} - 'theme'`
      : sql`jsonb_set(${users.options}, '{theme}', to_jsonb(${theme}::text))`;
  await db.update(users).set({ options: next }).where(eq(users.id, userId));
}

/** Saves the language the person chose, so it follows them to another browser at sign-in. */
export async function saveLocale(db: Database, userId: string, locale: Locale): Promise<void> {
  await db
    .update(users)
    .set({ options: sql`jsonb_set(${users.options}, '{locale}', to_jsonb(${locale}::text))` })
    .where(eq(users.id, userId));
}

/** The language saved in the account of an e-mail address, or null (no account, or none chosen). */
export async function savedLocaleOfEmail(db: Database, email: string): Promise<string | null> {
  const [row] = await db
    .select({ options: users.options })
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  return row?.options.locale ?? null;
}

/** The language saved by a person, or null. */
export async function savedLocaleOfUser(db: Database, userId: string): Promise<string | null> {
  return (await readOptions(db, userId)).locale ?? null;
}
