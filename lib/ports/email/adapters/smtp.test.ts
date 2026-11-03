import { describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue(undefined);
const createTransport = vi.fn((_options: unknown) => ({ sendMail }));
vi.mock("nodemailer", () => ({ createTransport }));

const { createSmtpSender, createSmtpServerSender } = await import("./smtp");

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

describe("a real SMTP server", () => {
  const server = {
    host: "smtp-relay.gmail.com",
    user: "envios@example.com",
    password: "app-password",
    from: "no-reply@example.com",
  };

  it("signs in, upgrades to TLS before it, greets with the sender's domain and pools", async () => {
    createTransport.mockClear();
    sendMail.mockClear();
    await createSmtpServerSender({ ...server, port: 587 }).send(message);
    expect(createTransport.mock.calls[0]?.[0]).toEqual({
      host: "smtp-relay.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      name: "example.com",
      auth: { user: "envios@example.com", pass: "app-password" },
      pool: true,
    });
    expect(sendMail.mock.calls[0]?.[0]).toMatchObject({
      from: "no-reply@example.com",
      to: ["ana@example.com"],
    });
  });

  it("speaks TLS from the start on port 465", () => {
    createTransport.mockClear();
    createSmtpServerSender({ ...server, port: 465 });
    expect(createTransport.mock.calls[0]?.[0]).toMatchObject({ secure: true, requireTLS: false });
  });
});
