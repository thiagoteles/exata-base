import { inArray } from "drizzle-orm";
import { mayEmail } from "@/domain/email/consent";
import type { Database } from "@/lib/db/database";
import { users } from "@/lib/db/schema/users";
import { resolvePreferences } from "@/lib/preferences/resolve";
import type { EmailMessage } from "./types";

/**
 * The addresses a message may go to. What an account needs always goes; the rest goes only to the
 * accounts that allow that category, and an address with no account gets nothing but the former.
 */
export async function allowedRecipients(
  db: Database,
  message: Pick<EmailMessage, "to" | "category">,
): Promise<string[]> {
  const addresses = [message.to].flat();
  if (message.category === "transactional") {
    return addresses;
  }
  const rows = await db
    .select({ email: users.email, options: users.options })
    .from(users)
    .where(
      inArray(
        users.email,
        addresses.map((address) => address.toLowerCase()),
      ),
    );
  const preferences = new Map(
    rows.map((row) => [row.email, resolvePreferences(row.options).email]),
  );
  return addresses.filter((address) =>
    mayEmail(message.category, preferences.get(address.toLowerCase()) ?? null),
  );
}
