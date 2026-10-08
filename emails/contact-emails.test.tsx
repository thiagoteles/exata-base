import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/ports/email/render";
import { contactNoticeMessage, contactReplyMessage } from "./contact-emails";

describe("contact e-mails", () => {
  it("tells the team who wrote, about what, the message itself, and where to open it", async () => {
    const { subject, element } = contactNoticeMessage({
      name: "Ana Souza",
      email: "ana@example.com",
      subjectLabel: "Suporte",
      body: "Não consigo baixar meus dados.",
      url: "http://localhost:3300/staff/contacts/abc",
    });
    const { html, text } = await renderEmail(element);
    expect(subject).toBe("Nova mensagem de contato: Suporte");
    for (const part of [
      "Ana Souza",
      "ana@example.com",
      "Suporte",
      "Não consigo baixar meus dados.",
    ]) {
      expect(text).toContain(part);
    }
    expect(html).toContain('href="http://localhost:3300/staff/contacts/abc"');
  });

  it("answers the person by name, with the answer first and their own message quoted below", async () => {
    const { subject, element } = contactReplyMessage({
      name: "Ana",
      reply: "Está na página da conta.",
      original: "Não consigo baixar meus dados.",
    });
    const { text } = await renderEmail(element);
    expect(subject).toBe("Resposta à sua mensagem");
    expect(text.indexOf("Olá, Ana.")).toBeLessThan(text.indexOf("Está na página da conta."));
    expect(text.indexOf("Está na página da conta.")).toBeLessThan(
      text.indexOf("Não consigo baixar meus dados."),
    );
  });

  it("writes what a person typed as text, never as markup", async () => {
    const { element } = contactReplyMessage({
      name: "Ana",
      reply: "<script>alert(1)</script>",
      original: "<b>x</b>",
    });
    const { html } = await renderEmail(element);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
