import { Heading, Text } from "@react-email/components";
import { type EmailTranslator, emailTranslator } from "@/lib/ports/email/render";
import { EmailLayout } from "./layout";

type TestInput = { sender: string; destination: string; sentAt: string };

/** The admin's test: it says what sent it and through where, so the inbox confirms the path. */
export function testEmailMessage(
  { sender, destination, sentAt }: TestInput,
  t: EmailTranslator = emailTranslator(),
) {
  return {
    subject: t("test.subject", { sentAt }),
    element: (
      <EmailLayout preview={t("test.preview")} footer={t("layout.footer")}>
        <Heading as="h1" style={{ fontSize: "22px", lineHeight: "28px", margin: "0 0 16px" }}>
          {t("test.heading")}
        </Heading>
        <Text style={{ margin: "0 0 8px" }}>{t("test.body", { sender, destination })}</Text>
        <Text style={{ margin: 0 }}>{t("test.sentAt", { sentAt })}</Text>
      </EmailLayout>
    ),
  };
}
