import { env } from "@/lib/env";
import { publicHref } from "@/lib/i18n/public-paths";
import { signUnsubscribe, type Unsubscribable } from "./token";

/**
 * The two addresses a recipient's unsubscribe takes. The page asks for a confirmation and is what
 * the body of the message links to; the one-click address is the one the mail client calls itself
 * from its "unsubscribe" button, with a POST and no screen in between.
 */
export type UnsubscribeLinks = { page: string; oneClick: string };

export function unsubscribeLinks(address: string, category: Unsubscribable): UnsubscribeLinks {
  const token = encodeURIComponent(signUnsubscribe(env.UNSUBSCRIBE_SECRET, { address, category }));
  return {
    page: `${env.APP_URL}${publicHref("/unsubscribe")}?token=${token}`,
    oneClick: `${env.APP_URL}/api/unsubscribe?token=${token}`,
  };
}
