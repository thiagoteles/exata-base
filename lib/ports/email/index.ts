import { env } from "@/lib/env";
import { logger } from "@/lib/ports/log";
import type { EmailMessage, EmailSender } from "./types";

/*
 * The e-mail port. A message is sent at once, inside the action: there is no outbox and no retry.
 * With MAILTRAP_TOKEN it goes to the Mailtrap Email API; otherwise, in the compose, to Mailpit.
 * A failure is logged as an error and reported to the caller, which decides what to tell the person.
 */

async function loadSender(): Promise<EmailSender | null> {
  if (env.MAILTRAP_TOKEN !== undefined) {
    const { createMailtrapSender } = await import("./adapters/mailtrap");
    return createMailtrapSender({
      token: env.MAILTRAP_TOKEN,
      from: env.EMAIL_FROM,
      inbox: env.MAILTRAP_INBOX,
    });
  }
  if (env.SMTP_LOCAL_URL !== undefined) {
    const { createSmtpSender } = await import("./adapters/smtp");
    return createSmtpSender(env.SMTP_LOCAL_URL, env.EMAIL_FROM);
  }
  return null;
}

let sender: Promise<EmailSender | null> | undefined;

/** Sends one message. Resolves to false when it was not sent; the reason is in the log. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  sender ??= loadSender();
  const destination = await sender;
  if (destination === null) {
    logger.error("email not sent: no destination is configured", { subject: message.subject });
    return false;
  }
  try {
    await destination.send(message);
    return true;
  } catch (error) {
    logger.error("email not sent", { subject: message.subject, error });
    return false;
  }
}
