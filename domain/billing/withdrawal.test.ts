import { describe, expect, it } from "vitest";
import { isWithinWithdrawal, withdrawalEndsAt } from "./withdrawal";

const paidAt = new Date("2026-06-01T15:30:00Z");

describe("right of withdrawal", () => {
  it("lasts exactly seven days from the payment", () => {
    expect(withdrawalEndsAt(paidAt).toISOString()).toBe("2026-06-08T15:30:00.000Z");
    expect(isWithinWithdrawal(paidAt, new Date("2026-06-08T15:30:00Z"))).toBe(true);
    expect(isWithinWithdrawal(paidAt, new Date("2026-06-08T15:30:01Z"))).toBe(false);
  });
});
