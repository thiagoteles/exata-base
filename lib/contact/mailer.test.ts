import { describe, expect, it } from "vitest";
import { notifyTeam } from "./mailer";
import type { ContactRow } from "./service";

const row = { id: "1", name: "Ana", email: "ana@example.com", body: "Oi" } as ContactRow;

describe("contact mailer", () => {
  it("tells nobody when no team address is configured, and says so", async () => {
    expect(await notifyTeam(row, { subject: "Suporte" }, [])).toBe(false);
  });
});
