import type { UnsubscribeLinks } from "@/lib/unsubscribe/links";
import type { EmailMessage } from "./types";

/** What a message carries so the recipient can leave: the link in its body and the headers a mail client reads. */
export const UNSUBSCRIBE_PLACEHOLDER = "{{unsubscribe_url}}";

/**
 * One copy of a reminder or newsletter for one recipient. The body was written once with the
 * placeholder where the link goes; here it gets this recipient's own link. The headers are what
 * Gmail and Yahoo require of anyone who sends a lot: a link for the "unsubscribe" button and the
 * word that says a POST to it is enough (RFC 8058).
 */
export function withUnsubscribe(
  message: EmailMessage,
  address: string,
  links: UnsubscribeLinks,
): EmailMessage {
  return {
    ...message,
    to: address,
    html: message.html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, links.page),
    text: message.text.replaceAll(UNSUBSCRIBE_PLACEHOLDER, links.page),
    headers: {
      ...message.headers,
      "List-Unsubscribe": `<${links.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
