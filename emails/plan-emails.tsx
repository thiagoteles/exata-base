import { type EmailTranslator, emailTranslator } from "@/lib/ports/email/render";
import { ActionEmail } from "./action-email";

type ExpiringInput = { name: string; endsOn: string; plansUrl: string };

/** Warns a person that a year they bought once is about to end, with the way to buy another. */
export function planExpiringMessage(
  { name, endsOn, plansUrl }: ExpiringInput,
  t: EmailTranslator = emailTranslator(),
) {
  return {
    subject: t("planExpiring.subject", { date: endsOn }),
    element: (
      <ActionEmail
        preview={t("planExpiring.preview", { date: endsOn })}
        greeting={name === "" ? t("greetingWithoutName") : t("planExpiring.greeting", { name })}
        body={t("planExpiring.body", { date: endsOn })}
        action={t("planExpiring.action")}
        url={plansUrl}
        ignore={t("planExpiring.ignore")}
        footer={t("layout.footer")}
      />
    ),
  };
}

/** Warns that a free trial is about to end and the first charge is near, with the way to manage the plan. */
export function trialEndingMessage(
  { name, endsOn, planUrl }: { name: string; endsOn: string; planUrl: string },
  t: EmailTranslator = emailTranslator(),
) {
  return {
    subject: t("trialEnding.subject", { date: endsOn }),
    element: (
      <ActionEmail
        preview={t("trialEnding.preview", { date: endsOn })}
        greeting={name === "" ? t("greetingWithoutName") : t("trialEnding.greeting", { name })}
        body={t("trialEnding.body", { date: endsOn })}
        action={t("trialEnding.action")}
        url={planUrl}
        ignore={t("trialEnding.ignore")}
        footer={t("layout.footer")}
      />
    ),
  };
}

/**
 * A reminder, sent once, to someone who started to subscribe and did not finish. It is a reminder
 * (about their own activity), so it carries the way to turn such notices off.
 */
export function abandonedCheckoutMessage(
  { name, plansUrl }: { name: string; plansUrl: string },
  t: EmailTranslator = emailTranslator(),
) {
  return {
    subject: t("abandonedCheckout.subject"),
    element: (
      <ActionEmail
        preview={t("abandonedCheckout.preview")}
        greeting={
          name === "" ? t("greetingWithoutName") : t("abandonedCheckout.greeting", { name })
        }
        body={t("abandonedCheckout.body")}
        action={t("abandonedCheckout.action")}
        url={plansUrl}
        ignore={t("abandonedCheckout.ignore")}
        footer={t("layout.footer")}
        unsubscribe={{
          reason: t("layout.unsubscribe.reason"),
          action: t("layout.unsubscribe.action"),
        }}
      />
    ),
  };
}
