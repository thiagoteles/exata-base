import {
  abandonedCheckoutMessage,
  planExpiringMessage,
  trialEndingMessage,
} from "@/emails/plan-emails";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/i18n/locales";
import { publicHref } from "@/lib/i18n/public-paths";
import { sendEmail } from "@/lib/ports/email";
import { emailTranslatorFor, renderEmail } from "@/lib/ports/email/render";
import type { SendResult } from "@/lib/ports/email/types";

/** Warns that a year bought once ends. It is what the account needs to know, so it is always sent. */
export async function sendPlanExpiring(input: {
  to: string;
  name: string;
  endsOn: string;
  locale: Locale;
}): Promise<boolean> {
  const { subject, element } = planExpiringMessage(
    {
      name: input.name,
      endsOn: input.endsOn,
      plansUrl: new URL(publicHref("/plans"), env.APP_URL).toString(),
    },
    await emailTranslatorFor(input.locale),
  );
  const { html, text } = await renderEmail(element);
  return (
    (await sendEmail({ to: input.to, category: "transactional", subject, html, text })) !== "failed"
  );
}

/** Warns that a free trial ends soon. What the account needs to know about money is always sent. */
export async function sendTrialEnding(input: {
  to: string;
  name: string;
  endsOn: string;
  locale: Locale;
}): Promise<boolean> {
  const { subject, element } = trialEndingMessage(
    {
      name: input.name,
      endsOn: input.endsOn,
      planUrl: new URL("/account/plan", env.APP_URL).toString(),
    },
    await emailTranslatorFor(input.locale),
  );
  const { html, text } = await renderEmail(element);
  return (
    (await sendEmail({ to: input.to, category: "transactional", subject, html, text })) !== "failed"
  );
}

/**
 * Reminds, once, someone who did not finish subscribing. It is a reminder, so the port leaves it out
 * for an account that turned reminders off, and answers `declined`, which is not a failure.
 */
export async function sendAbandonedCheckout(input: {
  to: string;
  name: string;
  locale: Locale;
}): Promise<SendResult> {
  const { subject, element } = abandonedCheckoutMessage(
    {
      name: input.name,
      plansUrl: new URL(`${publicHref("/plans")}?source=lembrete`, env.APP_URL).toString(),
    },
    await emailTranslatorFor(input.locale),
  );
  const { html, text } = await renderEmail(element);
  return sendEmail({ to: input.to, category: "reminder", subject, html, text });
}
