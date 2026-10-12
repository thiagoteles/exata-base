import { Body, Container, Head, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { UNSUBSCRIBE_PLACEHOLDER } from "@/lib/ports/email/unsubscribe";
import { emailPalette } from "./palette";

export type UnsubscribeNotice = { reason: string; action: string };

type EmailLayoutProps = {
  preview: string;
  footer: string;
  /**
   * Set on reminders and newsletters: why the person gets this, and the link that stops it. The
   * link is a placeholder that the e-mail port fills in for each recipient when it sends.
   */
  unsubscribe?: UnsubscribeNotice;
  children: ReactNode;
};

const fontStack = "Onest, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

/** The frame every e-mail shares. Text arrives already translated from the catalog. */
export function EmailLayout({ preview, footer, unsubscribe, children }: EmailLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: emailPalette.background,
          fontFamily: fontStack,
          margin: 0,
          padding: "32px 16px",
        }}
      >
        <Container
          style={{
            backgroundColor: emailPalette.surface,
            border: `1px solid ${emailPalette.line}`,
            borderRadius: "14px",
            maxWidth: "560px",
            padding: "32px",
          }}
        >
          <Section style={{ color: emailPalette.ink, fontSize: "17px", lineHeight: "26px" }}>
            {children}
          </Section>
        </Container>
        <Text
          style={{
            color: emailPalette.inkMuted,
            fontSize: "14px",
            lineHeight: "20px",
            textAlign: "center",
          }}
        >
          {footer}
        </Text>
        {unsubscribe === undefined ? null : (
          <Text
            style={{
              color: emailPalette.inkMuted,
              fontSize: "14px",
              lineHeight: "20px",
              textAlign: "center",
            }}
          >
            {unsubscribe.reason}{" "}
            <Link href={UNSUBSCRIBE_PLACEHOLDER} style={{ color: emailPalette.inkMuted }}>
              {unsubscribe.action}
            </Link>
          </Text>
        )}
      </Body>
    </Html>
  );
}
