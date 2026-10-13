import { describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue(undefined);
vi.mock("nodemailer", () => ({ createTransport: () => ({ sendMail }) }));

const { createSmtpSender } = await import("./smtp");

const message = {
  to: "ana@example.com",
  category: "transactional" as const,
  subject: "Oi",
  html: "<p>Oi</p>",
  text: "Oi",
};

describe("the local mail catcher", () => {
  it("hands the message to the transport with its attachments", async () => {
    sendMail.mockClear();
    await createSmtpSender("smtp://localhost:1025", "no-reply@app.test").send({
      ...message,
      attachments: [
        {
          filename: "extrato.pdf",
          contentType: "application/pdf",
          content: new TextEncoder().encode("abc"),
        },
      ],
    });
    const sent = sendMail.mock.calls[0]?.[0];
    expect(sent.to).toEqual(["ana@example.com"]);
    expect(sent.attachments).toEqual([
      { filename: "extrato.pdf", contentType: "application/pdf", content: Buffer.from("abc") },
    ]);
  });

  it("sends a message with no attachments without the field", async () => {
    sendMail.mockClear();
    await createSmtpSender("smtp://localhost:1025", "no-reply@app.test").send(message);
    expect(sendMail.mock.calls[0]?.[0]).not.toHaveProperty("attachments");
  });
});
