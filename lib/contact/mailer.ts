import { contactNoticeMessage, contactReplyMessage } from "@/emails/contact-emails";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/i18n/locales";
import { sendEmail } from "@/lib/ports/email";
import { emailTranslatorFor, renderEmail } from "@/lib/ports/email/render";
import type { ContactRow } from "./service";

/* The two e-mails the contact flow sends. Both go out at once, and a failure is reported, not hidden. */

type Labels = { subject: string };

/** Tells the team about a new message. Without CONTACT_EMAIL nobody is told: the inbox still has it. */
export async function notifyTeam(
  message: ContactRow,
  labels: Labels,
  recipients: readonly string[],
): Promise<boolean> {
  if (recipients.length === 0) {
    return false;
  }
  const { subject, element } = contactNoticeMessage({
    name: message.name,
    email: message.email,
    subjectLabel: labels.subject,
    body: message.body,
    url: new URL(`/staff/contacts/${message.id}`, env.APP_URL).toString(),
  });
  const { html, text } = await renderEmail(element);
  return (
    (await sendEmail({
      to: recipients,
      category: "transactional",
      subject,
      html,
      text,
      replyTo: message.email,
    })) !== "failed"
  );
}

/** Sends the answer to the person who wrote. Replies to it go to the first team address, if there is one. */
export async function sendReply(
  message: ContactRow,
  body: string,
  replyTo: string | undefined,
  locale: Locale,
): Promise<boolean> {
  const { subject, element } = contactReplyMessage(
    { name: message.name, reply: body, original: message.body },
    await emailTranslatorFor(locale),
  );
  const { html, text } = await renderEmail(element);
  return (
    (await sendEmail({
      to: message.email,
      category: "transactional",
      subject,
      html,
      text,
      ...(replyTo === undefined ? {} : { replyTo }),
    })) !== "failed"
  );
}
