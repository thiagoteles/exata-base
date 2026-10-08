import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { emailPalette } from "./palette";

type EmailLayoutProps = {
  preview: string;
  footer: string;
  children: ReactNode;
};

const fontStack = "Onest, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

/** The frame every e-mail shares. Text arrives already translated from the catalog. */
export function EmailLayout({ preview, footer, children }: EmailLayoutProps) {
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
      </Body>
    </Html>
  );
}
