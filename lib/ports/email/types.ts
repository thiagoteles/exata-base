import type { EmailCategory } from "@/domain/email/consent";

export type EmailMessage = {
  to: string | readonly string[];
  /** What the message is, so the port can leave out whoever turned that kind off. */
  category: EmailCategory;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/** The shape every e-mail destination implements. `send` rejects when the message was not accepted. */
export type EmailSender = { send: (message: EmailMessage) => Promise<void> };

/** `declined` is not a failure: everyone it was for had turned that kind of message off. */
export type SendResult = "sent" | "declined" | "failed";
