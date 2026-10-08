import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./layout";
import { emailPalette } from "./palette";

type ActionEmailProps = {
  preview: string;
  greeting: string;
  body: string;
  action: string;
  url: string;
  ignore: string;
  footer: string;
};

/** An e-mail whose whole point is one link: confirm, reset, accept. */
export function ActionEmail({
  preview,
  greeting,
  body,
  action,
  url,
  ignore,
  footer,
}: ActionEmailProps) {
  return (
    <EmailLayout preview={preview} footer={footer}>
      <Heading as="h1" style={{ fontSize: "22px", lineHeight: "28px", margin: "0 0 16px" }}>
        {greeting}
      </Heading>
      <Text style={{ margin: "0 0 24px" }}>{body}</Text>
      <Button
        href={url}
        style={{
          backgroundColor: emailPalette.action,
          borderRadius: "10px",
          color: emailPalette.onAction,
          fontSize: "16px",
          fontWeight: 600,
          padding: "12px 18px",
        }}
      >
        {action}
      </Button>
      <Text style={{ color: emailPalette.inkMuted, fontSize: "15px", margin: "24px 0 0" }}>
        {ignore}
      </Text>
    </EmailLayout>
  );
}
