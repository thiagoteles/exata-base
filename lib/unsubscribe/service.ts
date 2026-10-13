import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { emailSuppressions } from "@/lib/db/schema/email-suppressions";
import { users } from "@/lib/db/schema/users";
import { resolvePreferences } from "@/lib/preferences/resolve";
import { savePreference } from "@/lib/preferences/service";
import type { Unsubscription } from "./token";

/**
 * Turns off one kind of mail and leaves the others as they were. Doing it again changes nothing.
 * Reminders and news are the account's own choices, so an address with no account has nothing to
 * turn off, and the answer is the same either way: a link cannot be used to find out who has an
 * account. Billing mail reaches addresses with no account, so stopping it is a stored suppression
 * for the address, whoever holds it.
 */
export async function applyUnsubscribe(
  db: Database,
  { address, category }: Unsubscription,
): Promise<void> {
  const lowered = address.toLowerCase();
  if (category === "billing") {
    await db
      .insert(emailSuppressions)
      .values({ address: lowered, category: "billing" })
      .onConflictDoNothing();
    return;
  }
  const [user] = await db
    .select({ id: users.id, options: users.options })
    .from(users)
    .where(eq(users.email, lowered));
  if (user === undefined) {
    return;
  }
  const current = resolvePreferences(user.options).email;
  await savePreference(db, user.id, "email", {
    ...current,
    [category === "reminder" ? "reminders" : "news"]: false,
  });
}
