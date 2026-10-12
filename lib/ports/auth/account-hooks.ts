import type { ReactElement } from "react";
import { currentInstant } from "@/domain/clock";
import { type ClerkProfile, upsertClerkUser } from "@/lib/accounts/clerk-sync";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { sendEvent } from "@/lib/ports/analytics";
import { sendEmail } from "@/lib/ports/email";
import { chooseLocale, requestLocale } from "@/lib/ports/email/locale";
import { type EmailTranslator, emailTranslatorFor, renderEmail } from "@/lib/ports/email/render";
import { savedLocaleOfEmail } from "@/lib/preferences/service";

/*
 * What the auth adapters call when an account changes: the account e-mails, the sign-up event and
 * the Clerk row. The port loads this only when it makes an adapter, so a page that just asks who is
 * signed in never carries the e-mail port, the templates or the Clerk sync.
 */

type AccountMessage = { subject: string; element: ReactElement };

/** Sends an account e-mail in the recipient's saved language, else the one they are using now. */
export async function sendAccountEmail(
  to: string,
  build: (t: EmailTranslator) => AccountMessage,
): Promise<void> {
  const locale = chooseLocale(await savedLocaleOfEmail(db, to), await requestLocale());
  const message = build(await emailTranslatorFor(locale));
  const { html, text } = await renderEmail(message.element);
  if (
    (await sendEmail({ to, category: "transactional", subject: message.subject, html, text })) ===
    "failed"
  ) {
    // Surfacing the failure lets the sign-up screen tell the person the e-mail did not go out.
    throw new Error("account e-mail not sent");
  }
}

export function signedUp(accountId: string): void {
  sendEvent({ name: "signup_completed", accountId, data: {} });
}

/** Stores the Clerk user that just signed in, and counts the sign-up when the row is new. */
export async function storeClerkUser(profile: ClerkProfile): Promise<void> {
  const stored = await upsertClerkUser(db, profile, env.ADMIN_EMAILS, currentInstant());
  if (stored.created) {
    signedUp(stored.id);
  }
}
