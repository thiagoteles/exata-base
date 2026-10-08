import { type EmailTranslator, emailTranslator } from "@/lib/ports/email/render";
import { ActionEmail } from "./action-email";

type AccountEmail = { name: string; url: string };

export function verifyEmailMessage(
  { name, url }: AccountEmail,
  t: EmailTranslator = emailTranslator(),
) {
  return {
    subject: t("verifyEmail.subject"),
    element: (
      <ActionEmail
        preview={t("verifyEmail.preview")}
        greeting={
          name.trim() === "" ? t("greetingWithoutName") : t("verifyEmail.greeting", { name })
        }
        body={t("verifyEmail.body")}
        action={t("verifyEmail.action")}
        url={url}
        ignore={t("verifyEmail.ignore")}
        footer={t("layout.footer")}
      />
    ),
  };
}

export function resetPasswordMessage(
  { name, url }: AccountEmail,
  t: EmailTranslator = emailTranslator(),
) {
  return {
    subject: t("resetPassword.subject"),
    element: (
      <ActionEmail
        preview={t("resetPassword.preview")}
        greeting={
          name.trim() === "" ? t("greetingWithoutName") : t("resetPassword.greeting", { name })
        }
        body={t("resetPassword.body")}
        action={t("resetPassword.action")}
        url={url}
        ignore={t("resetPassword.ignore")}
        footer={t("layout.footer")}
      />
    ),
  };
}
