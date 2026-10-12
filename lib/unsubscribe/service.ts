import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { users } from "@/lib/db/schema/users";
import { resolvePreferences } from "@/lib/preferences/resolve";
import { savePreference } from "@/lib/preferences/service";
import type { Unsubscription } from "./token";

/**
 * Turns off one kind of mail for the account with that address, and leaves the other as it was.
 * Doing it again changes nothing. An address with no account has nothing to turn off, and the
 * answer is the same either way, so a link cannot be used to find out who has an account.
 */
export async function applyUnsubscribe(
  db: Database,
  { address, category }: Unsubscription,
): Promise<void> {
  const [user] = await db
    .select({ id: users.id, options: users.options })
    .from(users)
    .where(eq(users.email, address.toLowerCase()));
  if (user === undefined) {
    return;
  }
  const current = resolvePreferences(user.options).email;
  await savePreference(db, user.id, "email", {
    ...current,
    [category === "reminder" ? "reminders" : "news"]: false,
  });
}
