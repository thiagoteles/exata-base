import { testEmailMessage } from "@/emails/test-email";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/i18n/locales";
import { emailDestination, probeEmail } from "@/lib/ports/email";
import { emailTranslatorFor, renderEmail } from "@/lib/ports/email/render";

const describe = (destination: ReturnType<typeof emailDestination>) =>
  destination.kind === "smtp" ? `${destination.host}:${destination.port}` : destination.kind;

/**
 * Sends the admin a test message through the configured destination, to their own address only, so
 * the button cannot be used to mail anyone else. `sentAt` is written by the caller, which holds the
 * clock.
 */
export async function sendTestEmail(input: { to: string; locale: Locale; sentAt: string }) {
  const { subject, element } = testEmailMessage(
    { sender: env.EMAIL_FROM, destination: describe(emailDestination()), sentAt: input.sentAt },
    await emailTranslatorFor(input.locale),
  );
  const { html, text } = await renderEmail(element);
  return await probeEmail({ to: input.to, category: "transactional", subject, html, text });
}
