import { createTransport, type Transporter } from "nodemailer";
import type { EmailMessage, EmailSender } from "../types";

/*
 * E-mail by SMTP: in production through a real server (the Google Workspace relay, Amazon SES or
 * any other), in the compose through the local mail catcher, which never leaves the machine.
 */

function senderOver(transport: Transporter, from: string): EmailSender {
  return {
    async send(message: EmailMessage) {
      await transport.sendMail({
        from,
        to: [...(typeof message.to === "string" ? [message.to] : message.to)],
        ...(message.cc === undefined || message.cc.length === 0 ? {} : { cc: [...message.cc] }),
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

/** The local mail catcher, by its URL. Plain text is fine: it is on this machine or in the compose. */
export function createSmtpSender(url: string, from: string): EmailSender {
  return senderOver(createTransport(url), from);
}

export type SmtpServer = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

/**
 * A real SMTP server, signed in. Port 465 speaks TLS from the first byte; any other port must
 * upgrade to TLS before signing in, or the message is not sent, so the password and the mail never
 * travel in the clear. The greeting names the sender's domain, which a relay may judge, rather than
 * the container's random host name. The connection is pooled: a newsletter sends one copy per
 * recipient, and opening a connection for each would be slow and look like abuse to the server.
 */
export function createSmtpServerSender({
  host,
  port,
  user,
  password,
  from,
}: SmtpServer): EmailSender {
  const transport = createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    name: from.split("@")[1] ?? host,
    auth: { user, pass: password },
    pool: true,
  });
  return senderOver(transport, from);
}
