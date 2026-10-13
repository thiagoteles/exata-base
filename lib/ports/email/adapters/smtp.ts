import { createTransport } from "nodemailer";
import type { EmailMessage, EmailSender } from "../types";

/* The local mail catcher. It never leaves the machine: the compose points it at Mailpit. */
export function createSmtpSender(url: string, from: string): EmailSender {
  const transport = createTransport(url);
  return {
    async send(message: EmailMessage) {
      await transport.sendMail({
        from,
        to: [...(typeof message.to === "string" ? [message.to] : message.to)],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo === undefined ? {} : { replyTo: message.replyTo }),
        ...(message.headers === undefined ? {} : { headers: { ...message.headers } }),
        ...(message.attachments === undefined || message.attachments.length === 0
          ? {}
          : {
              attachments: message.attachments.map((file) => ({
                filename: file.filename,
                contentType: file.contentType,
                content: Buffer.from(file.content),
              })),
            }),
      });
    },
  };
}
