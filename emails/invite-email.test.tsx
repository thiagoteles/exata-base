import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/ports/email/render";
import { inviteMessage } from "./invite-email";

describe("invite e-mail", () => {
  it("says who invited, in which role, and links to sign-up", async () => {
    const { subject, element } = inviteMessage({
      inviterEmail: "admin@example.com",
      role: "staff",
      url: "http://localhost:47300/sign-up?invite=abc",
    });
    const { html, text } = await renderEmail(element);
    expect(subject).toBe("Você foi convidado");
    expect(text).toContain("admin@example.com");
    expect(text).toContain("equipe");
    expect(html).toContain('href="http://localhost:47300/sign-up?invite=abc"');
  });
});
