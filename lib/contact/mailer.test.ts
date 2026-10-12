import { describe, expect, it, vi } from "vitest";
import type { ContactRow } from "./service";

// Mail to the team needs nothing from the database, so a stand-in is all the port asks for here.
vi.mock("@/lib/db/client", () => ({ db: {} }));

const { notifyTeam } = await import("./mailer");

const row = { id: "1", name: "Ana", email: "ana@example.com", body: "Oi" } as ContactRow;

describe("contact mailer", () => {
  it("tells nobody when no team address is configured, and says so", async () => {
    expect(await notifyTeam(row, { subject: "Suporte" }, [])).toBe(false);
  });
});
