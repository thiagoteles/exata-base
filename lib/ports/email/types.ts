import type { EmailCategory } from "@/domain/email/consent";

/** A file that travels with a message. The port checks the total size and cleans the name. */
export type EmailAttachment = {
  filename: string;
  contentType: string;
  content: Uint8Array;
};

export type EmailMessage = {
  to: string | readonly string[];
  /**
   * Addresses that get the same message in copy, seen by every recipient. Only for mail the person
   * asked to send (`transactional`): reminders and news go one copy per recipient, so they have none.
   */
  cc?: readonly string[];
  /** What the message is, so the port can leave out whoever turned that kind off. */
  category: EmailCategory;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Readonly<Record<string, string>>;
  attachments?: readonly EmailAttachment[];
};

/** The shape every e-mail destination implements. `send` rejects when the message was not accepted. */
export type EmailSender = { send: (message: EmailMessage) => Promise<void> };

/** `declined` is not a failure: everyone it was for had turned that kind of message off. */
export type SendResult = "sent" | "declined" | "failed";
