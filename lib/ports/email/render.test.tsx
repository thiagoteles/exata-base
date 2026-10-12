import { Text } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { EmailLayout } from "@/emails/layout";
import { emailTranslator, renderEmail } from "./render";

describe("e-mail rendering", () => {
  it("produces HTML and plain text, with the footer from the catalog", async () => {
    const t = emailTranslator();
    const { html, text } = await renderEmail(
      <EmailLayout preview="Prévia" footer={t("layout.footer")}>
        <Text>Olá, Ana</Text>
      </EmailLayout>,
    );
    expect(html).toContain("<!DOCTYPE html");
    expect(html).toContain("Olá, Ana");
    expect(text).toContain("Olá, Ana");
    expect(text).toContain("Este é um e-mail automático");
    expect(text).not.toContain("<");
  });
});

describe("plain text", () => {
  it("keeps a heading as it was written", async () => {
    const { text } = await renderEmail(
      <EmailLayout preview="x" footer="y">
        <h1>Olá, Ana Souza.</h1>
      </EmailLayout>,
    );
    expect(text).toContain("Olá, Ana Souza.");
  });
});
