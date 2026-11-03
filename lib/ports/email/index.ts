import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/ports/log";
import { unsubscribeLinks } from "@/lib/unsubscribe/links";
import { prepareAttachments } from "./attachments";
import { allowedRecipients } from "./consent";
import type { EmailMessage, EmailSender, SendResult } from "./types";
import { withUnsubscribe } from "./unsubscribe";

/*
 * The e-mail port. A message is sent at once, inside the action: there is no outbox and no retry.
 * With SMTP_HOST it goes through that SMTP server; otherwise, in the compose, to Mailpit.
 * A failure is logged as an error and reported to the caller, which decides what to tell the person.
 * A message of a kind the person turned off is not sent and is reported as declined, which is not
 * an error.
 */

async function loadSender(): Promise<EmailSender | null> {
  if (
    env.SMTP_HOST !== undefined &&
    env.SMTP_USER !== undefined &&
    env.SMTP_PASSWORD !== undefined
  ) {
    const { createSmtpServerSender } = await import("./adapters/smtp");
    return createSmtpServerSender({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      from: env.EMAIL_FROM,
    });
  }
  if (env.SMTP_LOCAL_URL !== undefined) {
    const { createSmtpSender } = await import("./adapters/smtp");
    return createSmtpSender(env.SMTP_LOCAL_URL, env.EMAIL_FROM);
  }
  return null;
}

let sender: Promise<EmailSender | null> | undefined;

/** Sends one message to whoever may get it. The reason for anything but "sent" is in the log. */
export async function sendEmail(input: EmailMessage): Promise<SendResult> {
  const prepared = prepareAttachments(input.attachments, env.EMAIL_ATTACHMENTS_MAX_MB);
  if (!prepared.ok) {
    // A caller that attaches files checks the same cap first and shows the sizes; this is the backstop.
    logger.error("email not sent: the attachments are over the cap", {
      subject: input.subject,
      totalBytes: prepared.check.totalBytes,
      maxBytes: prepared.check.maxBytes,
    });
    return "failed";
  }
  const message: EmailMessage =
    prepared.attachments === undefined ? input : { ...input, attachments: prepared.attachments };
  const recipients = await allowedRecipients(db, message);
  if (recipients.length === 0) {
    return "declined";
  }
  sender ??= loadSender();
  const destination = await sender;
  if (destination === null) {
    logger.error("email not sent: no destination is configured", { subject: message.subject });
    return "failed";
  }
  try {
    if (message.category === "transactional") {
      await destination.send({ ...message, to: recipients });
    } else {
      // Each recipient gets a copy with a link of their own, so the link says whose it is; a copy
      // shared with others would carry someone else's link, so these go without one.
      const { category, cc: _shared, ...single } = message;
      for (const address of recipients) {
        // biome-ignore lint/performance/noAwaitInLoops: one copy after another keeps the order and the provider's rate
        await destination.send(
          withUnsubscribe({ ...single, category }, address, unsubscribeLinks(address, category)),
        );
      }
    }
    return "sent";
  } catch (error) {
    logger.error("email not sent", { subject: message.subject, error });
    return "failed";
  }
}

/** Where mail goes, as the admin's health page shows it. Never the user or the password. */
export type EmailDestination =
  | { kind: "smtp"; host: string; port: number }
  | { kind: "local" }
  | { kind: "none" };

export function emailDestination(): EmailDestination {
  if (
    env.SMTP_HOST !== undefined &&
    env.SMTP_USER !== undefined &&
    env.SMTP_PASSWORD !== undefined
  ) {
    return { kind: "smtp", host: env.SMTP_HOST, port: env.SMTP_PORT };
  }
  return env.SMTP_LOCAL_URL === undefined ? { kind: "none" } : { kind: "local" };
}

/** A server's refusal can be long; the screen needs the code and the first lines. */
const MAX_REASON = 600;

/**
 * Sends one message straight to the destination, past the consent filter, and answers with the
 * server's own words when it is refused: the admin's test, where "failed" alone says nothing about
 * a wrong password, a sender the relay refuses or a server out of reach.
 */
export async function probeEmail(
  message: EmailMessage,
): Promise<{ ok: true } | { ok: false; reason: string | null }> {
  sender ??= loadSender();
  const destination = await sender;
  if (destination === null) {
    // Nothing to quote: the screen says in its own words that no server is configured.
    return { ok: false, reason: null };
  }
  try {
    await destination.send(message);
    return { ok: true };
  } catch (error) {
    logger.error("test email not sent", { subject: message.subject, error });
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: reason.slice(0, MAX_REASON) };
  }
}
