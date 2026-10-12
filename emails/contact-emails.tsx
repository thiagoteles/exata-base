import { Heading, Hr, Text } from "@react-email/components";
import { type EmailTranslator, emailTranslator } from "@/lib/ports/email/render";
import { ActionEmail } from "./action-email";
import { EmailLayout } from "./layout";
import { emailPalette } from "./palette";

type NoticeInput = { name: string; email: string; subjectLabel: string; body: string; url: string };

/** Goes to the team when someone writes through the contact form. */
export function contactNoticeMessage(
  { name, email, subjectLabel, body, url }: NoticeInput,
  t: EmailTranslator = emailTranslator(),
) {
  return {
    subject: t("contactNotice.subject", { subject: subjectLabel }),
    element: (
      <ActionEmail
        preview={t("contactNotice.preview", { name })}
        greeting={t("contactNotice.heading")}
        body={`${t("contactNotice.from")}: ${name} <${email}>. ${t("contactNotice.subjectLabel")}: ${subjectLabel}.`}
        action={t("contactNotice.action")}
        url={url}
        ignore={body}
        footer={t("layout.footer")}
      />
    ),
  };
}

type ReplyInput = { name: string; reply: string; original: string };

/** Goes to the person who wrote, with the answer and their own message quoted below it. */
export function contactReplyMessage(
  { name, reply, original }: ReplyInput,
  t: EmailTranslator = emailTranslator(),
) {
  return {
    subject: t("contactReply.subject"),
    element: (
      <EmailLayout preview={t("contactReply.preview")} footer={t("layout.footer")}>
        <Heading as="h1" style={{ fontSize: "22px", lineHeight: "28px", margin: "0 0 16px" }}>
          {t("contactReply.greeting", { name })}
        </Heading>
        <Text style={{ margin: "0 0 8px" }}>{t("contactReply.intro")}</Text>
        <Text style={{ margin: "0 0 24px", whiteSpace: "pre-wrap" }}>{reply}</Text>
        <Hr style={{ borderColor: emailPalette.line }} />
        <Text style={{ color: emailPalette.inkMuted, fontSize: "15px", margin: "16px 0 4px" }}>
          {t("contactReply.original")}
        </Text>
        <Text
          style={{
            color: emailPalette.inkMuted,
            fontSize: "15px",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {original}
        </Text>
      </EmailLayout>
    ),
  };
}
