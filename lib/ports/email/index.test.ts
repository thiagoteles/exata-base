import { describe, expect, it } from "vitest";
import { sendEmail } from ".";

describe("e-mail port", () => {
  it("reports a message as not sent when no destination is configured", async () => {
    expect(
      await sendEmail({ to: "ana@example.com", subject: "Oi", html: "<p>Oi</p>", text: "Oi" }),
    ).toBe(false);
  });
});
