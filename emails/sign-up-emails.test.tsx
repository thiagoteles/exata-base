import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/ports/email/render";
import { signUpNoticeMessage } from "./sign-up-emails";

describe("the sign-up notice", () => {
  it("tells the admins who signed up, when, the count, and where to open the account", async () => {
    const { subject, element } = signUpNoticeMessage({
      name: "Ana Souza",
      email: "ana@example.com",
      date: "07/11/2026",
      time: "14:32",
      total: 213,
      url: "http://localhost:47300/admin/users/abc",
    });
    const { html, text } = await renderEmail(element);
    expect(subject).toBe("Novo cadastro: ana@example.com");
    for (const part of [
      "Ana Souza",
      "ana@example.com",
      "07/11/2026 às 14:32",
      "Agora são 213 contas.",
    ]) {
      expect(text).toContain(part);
    }
    expect(html).toContain('href="http://localhost:47300/admin/users/abc"');
  });

  it("writes the e-mail alone when the person gave no name, and escapes what they typed", async () => {
    const { element } = signUpNoticeMessage({
      name: "<b>Ana</b>",
      email: "ana@example.com",
      date: "07/11/2026",
      time: "14:32",
      total: 1,
      url: "http://localhost:47300/admin/users/abc",
    });
    const { html } = await renderEmail(element);
    expect(html).not.toContain("<b>Ana</b>");
    const plain = signUpNoticeMessage({
      name: " ",
      email: "ana@example.com",
      date: "07/11/2026",
      time: "14:32",
      total: 1,
      url: "http://localhost:47300/admin/users/abc",
    });
    expect((await renderEmail(plain.element)).text).not.toContain("<ana@example.com>");
  });
});
