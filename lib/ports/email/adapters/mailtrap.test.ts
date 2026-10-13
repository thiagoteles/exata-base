import { describe, expect, it } from "vitest";
import { createMailtrapSender } from "./mailtrap";

function recordingFetch(status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Promise.resolve(new Response("{}", { status }));
  };
  return { calls, fetch: fetch as typeof globalThis.fetch };
}

const message = {
  to: "ana@example.com",
  category: "transactional" as const,
  subject: "Oi",
  html: "<p>Oi</p>",
  text: "Oi",
};

describe("Mailtrap Email API", () => {
  it("posts the message with the token to the sending API", async () => {
    const { calls, fetch } = recordingFetch();
    await createMailtrapSender({ token: "tok", from: "no-reply@app.test", fetch }).send(message);
    expect(calls[0]?.url).toBe("https://send.api.mailtrap.io/api/send");
    expect(new Headers(calls[0]?.init.headers).get("authorization")).toBe("Bearer tok");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      from: { email: "no-reply@app.test" },
      to: [{ email: "ana@example.com" }],
      subject: "Oi",
      html: "<p>Oi</p>",
      text: "Oi",
    });
  });

  it("sends each attachment as base64 with its name and type", async () => {
    const { calls, fetch } = recordingFetch();
    await createMailtrapSender({ token: "tok", from: "no-reply@app.test", fetch }).send({
      ...message,
      attachments: [
        {
          filename: "INV-0008.pdf",
          contentType: "application/pdf",
          content: new TextEncoder().encode("%PDF-1.7"),
        },
      ],
    });
    expect(JSON.parse(String(calls[0]?.init.body)).attachments).toEqual([
      {
        filename: "INV-0008.pdf",
        type: "application/pdf",
        content: Buffer.from("%PDF-1.7").toString("base64"),
        disposition: "attachment",
      },
    ]);
  });

  it("leaves the attachments field out when there are none", async () => {
    const { calls, fetch } = recordingFetch();
    await createMailtrapSender({ token: "tok", from: "a@b.c", fetch }).send({
      ...message,
      attachments: [],
    });
    expect(JSON.parse(String(calls[0]?.init.body))).not.toHaveProperty("attachments");
  });

  it("sends to the sandbox inbox, where nobody receives it, when an inbox is set", async () => {
    const { calls, fetch } = recordingFetch();
    await createMailtrapSender({ token: "tok", from: "a@b.c", inbox: "123", fetch }).send(message);
    expect(calls[0]?.url).toBe("https://sandbox.api.mailtrap.io/api/send/123");
  });

  it("fails when Mailtrap refuses the message", async () => {
    const { fetch } = recordingFetch(401);
    await expect(
      createMailtrapSender({ token: "bad", from: "a@b.c", fetch }).send(message),
    ).rejects.toThrow("401");
  });
});
