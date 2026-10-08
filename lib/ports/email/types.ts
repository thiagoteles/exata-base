export type EmailMessage = {
  to: string | readonly string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

/** The shape every e-mail destination implements. `send` rejects when the message was not accepted. */
export type EmailSender = { send: (message: EmailMessage) => Promise<void> };
