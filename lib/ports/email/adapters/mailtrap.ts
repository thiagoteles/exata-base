import type { EmailMessage, EmailSender } from "../types";

/*
 * The Mailtrap Email API. With an inbox id the same request goes to the sandbox, where the
 * message is kept for inspection and reaches nobody.
 */

type Options = {
  token: string;
  from: string;
  inbox?: string | undefined;
  fetch?: typeof globalThis.fetch;
};

const SEND_URL = "https://send.api.mailtrap.io/api/send";
const sandboxUrl = (inbox: string) => `https://sandbox.api.mailtrap.io/api/send/${inbox}`;

export function createMailtrapSender({
  token,
  from,
  inbox,
  fetch = globalThis.fetch,
}: Options): EmailSender {
  const url = inbox === undefined ? SEND_URL : sandboxUrl(inbox);
  return {
    async send(message: EmailMessage) {
      const recipients = typeof message.to === "string" ? [message.to] : message.to;
      const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: { email: from },
          to: recipients.map((email) => ({ email })),
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo === undefined ? {} : { reply_to: { email: message.replyTo } }),
        }),
      });
      if (!response.ok) {
        throw new Error(`Mailtrap refused the message with status ${response.status}`);
      }
    },
  };
}
