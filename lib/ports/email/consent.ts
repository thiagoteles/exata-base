import { and, eq, inArray } from "drizzle-orm";
import { mayEmail } from "@/domain/email/consent";
import type { Database } from "@/lib/db/database";
import { emailSuppressions } from "@/lib/db/schema/email-suppressions";
import { users } from "@/lib/db/schema/users";
import { resolvePreferences } from "@/lib/preferences/resolve";
import type { EmailMessage } from "./types";

/**
 * The addresses a message may go to. What an account needs always goes; the rest goes only to the
 * accounts that allow that category, and an address with no account gets nothing but the former
 * and billing mail, which an address stops by using the link in it.
 */
export async function allowedRecipients(
  db: Database,
  message: Pick<EmailMessage, "to" | "category">,
): Promise<string[]> {
  const addresses = [message.to].flat();
  if (message.category === "transactional") {
    return addresses;
  }
  const lowered = addresses.map((address) => address.toLowerCase());
  if (message.category === "billing") {
    const stopped = await db
      .select({ address: emailSuppressions.address })
      .from(emailSuppressions)
      .where(
        and(eq(emailSuppressions.category, "billing"), inArray(emailSuppressions.address, lowered)),
      );
    const suppressed = new Set(stopped.map((row) => row.address));
    return addresses.filter((address) =>
      mayEmail("billing", null, suppressed.has(address.toLowerCase())),
    );
  }
  const rows = await db
    .select({ email: users.email, options: users.options })
    .from(users)
    .where(inArray(users.email, lowered));
  const preferences = new Map(
    rows.map((row) => [row.email, resolvePreferences(row.options).email]),
  );
  return addresses.filter((address) =>
    mayEmail(message.category, preferences.get(address.toLowerCase()) ?? null),
  );
}
