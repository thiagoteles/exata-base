import { describe, expect, it, vi } from "vitest";

// Mail a person needs never reads the database, so a stand-in is all the port asks for here.
vi.mock("@/lib/db/client", () => ({ db: {} }));
const error = vi.fn();
vi.mock("@/lib/ports/log", () => ({ logger: { error, warn: vi.fn(), info: vi.fn() } }));

const { sendEmail } = await import(".");

describe("e-mail port", () => {
  it("reports a message as not sent when no destination is configured", async () => {
    expect(
      await sendEmail({
        to: "ana@example.com",
        category: "transactional",
        subject: "Oi",
        html: "<p>Oi</p>",
        text: "Oi",
      }),
    ).toBe("failed");
  });

  it("refuses attachments over the cap before it looks for a destination or a recipient", async () => {
    error.mockClear();
    const result = await sendEmail({
      to: "ana@example.com",
      category: "transactional",
      subject: "Pacote",
      html: "<p>Oi</p>",
      text: "Oi",
      attachments: [
        {
          filename: "grande.pdf",
          contentType: "application/pdf",
          content: new Uint8Array(11 * 1_048_576),
        },
      ],
    });
    expect(result).toBe("failed");
    expect(error).toHaveBeenCalledWith(
      "email not sent: the attachments are over the cap",
      expect.objectContaining({ subject: "Pacote", maxBytes: 10 * 1_048_576 }),
    );
  });
});
