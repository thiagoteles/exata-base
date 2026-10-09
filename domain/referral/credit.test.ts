import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { creditFor } from "./credit";

const base = {
  configuredCents: 1000,
  referrerId: "ana",
  referredId: "bia",
  rewardedAt: null,
  referredHasPaid: true,
};

describe("the credit an invitation earns", () => {
  it("is the catalog's amount when the invited person has paid, once", () => {
    expect(creditFor(base)).toBe(1000);
    expect(creditFor({ ...base, rewardedAt: new Date() })).toBe(0);
  });

  it("is nothing before a payment, with the program off, for a self-invitation, or with no inviter left", () => {
    expect(creditFor({ ...base, referredHasPaid: false })).toBe(0);
    expect(creditFor({ ...base, configuredCents: 0 })).toBe(0);
    expect(creditFor({ ...base, configuredCents: -5 })).toBe(0);
    expect(creditFor({ ...base, referrerId: "bia" })).toBe(0);
    expect(creditFor({ ...base, referrerId: null })).toBe(0);
  });

  it("is always a whole number of cents, never negative and never above what is configured", () => {
    fc.assert(
      fc.property(fc.double({ min: -100, max: 1e6, noNaN: true }), (configured) => {
        const credit = creditFor({ ...base, configuredCents: configured });
        expect(Number.isInteger(credit)).toBe(true);
        expect(credit).toBeGreaterThanOrEqual(0);
        expect(credit).toBeLessThanOrEqual(Math.max(configured, 0));
      }),
    );
  });
});
