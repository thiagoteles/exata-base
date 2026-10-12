import { describe, expect, it } from "vitest";
import { REMINDER_WINDOW_DAYS, worthReminding } from "./abandonment";

const DAY = 86_400_000;
const now = new Date("2026-10-09T12:00:00Z");
const expired = (daysAgo: number) => ({
  status: "expired",
  closedAt: new Date(now.getTime() - daysAgo * DAY),
  remindedAt: null,
});

describe("an abandoned checkout", () => {
  it("is worth one reminder while it is recent", () => {
    expect(worthReminding(expired(0), now)).toBe(true);
    expect(worthReminding(expired(REMINDER_WINDOW_DAYS), now)).toBe(true);
  });

  it("is not worth one after the window, before it closed, or once reminded", () => {
    expect(worthReminding(expired(REMINDER_WINDOW_DAYS + 0.01), now)).toBe(false);
    expect(worthReminding(expired(-1), now)).toBe(false);
    expect(worthReminding({ ...expired(1), remindedAt: now }, now)).toBe(false);
  });

  it("is only a checkout that expired unpaid, never one that is open, paid, waiting or refused", () => {
    for (const status of ["open", "pending", "paid", "failed"]) {
      expect(worthReminding({ ...expired(1), status }, now)).toBe(false);
    }
    expect(worthReminding({ status: "expired", closedAt: null, remindedAt: null }, now)).toBe(
      false,
    );
  });
});
