import { describe, expect, it, vi } from "vitest";
import { cadences } from "@/domain/operations/cadence";
import heartbeats from "@/ops/gcp/heartbeats.json";
import { scheduledOperations } from "./registry";

// The registry only needs the operations' names and cadences, not a way to send e-mail.
vi.mock("@/lib/billing/mailer", () => ({
  sendPlanExpiring: () => Promise.resolve(true),
  sendAbandonedCheckout: () => Promise.resolve("sent"),
}));

describe("the scheduled operations", () => {
  it("have names of their own, and a cadence the host knows", () => {
    const names = scheduledOperations.map((operation) => operation.name);
    expect(new Set(names).size).toBe(names.length);
    for (const operation of scheduledOperations) {
      expect(cadences).toContain(operation.cadence);
    }
  });

  it("have an absence alarm for every cadence that has an operation", () => {
    // A cadence the host calls but nobody watches would stop in silence. The alarm and the panel
    // read the same file, so a line here is also what makes the health panel list the cadence.
    const watched = new Set(heartbeats.map((entry) => entry.job));
    const unwatched = [
      ...new Set(scheduledOperations.map((operation) => operation.cadence)),
    ].filter((cadence) => !watched.has(cadence));
    expect(unwatched).toEqual([]);
  });

  it("give every alarm a window in seconds", () => {
    for (const entry of heartbeats) {
      expect(entry.window).toMatch(/^\d+s$/);
    }
  });
});
