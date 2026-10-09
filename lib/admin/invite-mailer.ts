import { inviteMessage } from "@/emails/invite-email";
import type { Role } from "@/lib/accounts/roles";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/i18n/locales";
import { sendEmail } from "@/lib/ports/email";
import { emailTranslatorFor, renderEmail } from "@/lib/ports/email/render";

/** Sends the invite link in the given language. Resolves to false when the e-mail was not sent. */
export async function sendInvite(input: {
  to: string;
  inviterEmail: string;
  role: Role;
  token: string;
  locale: Locale;
}): Promise<boolean> {
  const url = new URL("/sign-up", env.APP_URL);
  url.searchParams.set("invite", input.token);
  const { subject, element } = inviteMessage(
    { inviterEmail: input.inviterEmail, role: input.role, url: url.toString() },
    await emailTranslatorFor(input.locale),
  );
  const { html, text } = await renderEmail(element);
  return (
    (await sendEmail({ to: input.to, category: "transactional", subject, html, text })) !== "failed"
  );
}
