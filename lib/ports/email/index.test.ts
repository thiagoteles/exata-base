import { describe, expect, it, vi } from "vitest";

// Mail a person needs never reads the database, so a stand-in is all the port asks for here.
vi.mock("@/lib/db/client", () => ({ db: {} }));

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
});
