import { type EmailTranslator, emailTranslator } from "@/lib/ports/email/render";
import { ActionEmail } from "./action-email";

type NoticeInput = {
  name: string;
  email: string;
  /** When the account was made, the day and the hour already written in the product's zone. */
  date: string;
  time: string;
  /** How many accounts exist now, this one included. */
  total: number;
  url: string;
};

/** Goes to the admins when someone finishes signing up, so a new account is seen the day it comes. */
export function signUpNoticeMessage(
  { name, email, date, time, total, url }: NoticeInput,
  t: EmailTranslator = emailTranslator(),
) {
  const who = name.trim() === "" ? email : `${name.trim()} <${email}>`;
  return {
    subject: t("signUpNotice.subject", { email }),
    element: (
      <ActionEmail
        preview={t("signUpNotice.preview", { email })}
        greeting={t("signUpNotice.heading")}
        body={t("signUpNotice.body", { who, date, time, total })}
        action={t("signUpNotice.action")}
        url={url}
        ignore={t("signUpNotice.why")}
        footer={t("layout.footer")}
      />
    ),
  };
}
