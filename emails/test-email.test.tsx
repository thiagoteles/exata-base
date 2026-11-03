import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/ports/email/render";
import { testEmailMessage } from "./test-email";

describe("the admin's test e-mail", () => {
  it("names the sender, the server it went through and when", async () => {
    const { subject, element } = testEmailMessage({
      sender: "no-reply@example.com",
      destination: "smtp-relay.gmail.com:587",
      sentAt: "02/11/2026, 22:10:00",
    });
    const { text } = await renderEmail(element);
    expect(subject).toBe("E-mail de teste (02/11/2026, 22:10:00)");
    for (const part of ["no-reply@example.com", "smtp-relay.gmail.com:587", "22:10:00"]) {
      expect(text).toContain(part);
    }
  });
});
