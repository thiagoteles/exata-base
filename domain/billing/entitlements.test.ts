import { describe, expect, it } from "vitest";
import { entitlementsOf, isPaidTier, type PlanState } from "./entitlements";

const now = new Date("2026-06-01T12:00:00Z");
const plan = (over: Partial<PlanState> = {}): PlanState => ({
  tier: "paid",
  status: "active",
  currentPeriodEnd: null,
  ...over,
});

describe("entitlements", () => {
  it("grant the tier's features, including the ones it extends", () => {
    const paid = entitlementsOf(plan(), now);
    expect(paid.tier).toBe("paid");
    expect(paid.features.has("premium")).toBe(true);
  });

  it("grant free with no plan, a pending payment or a canceled plan", () => {
    expect(entitlementsOf(null, now).features.size).toBe(0);
    expect(entitlementsOf(plan({ status: "pending" }), now).tier).toBe("free");
    expect(entitlementsOf(plan({ status: "canceled" }), now).tier).toBe("free");
  });

  it("keep the tier while a charge fails and while a trial runs, not after it ends", () => {
    expect(entitlementsOf(plan({ status: "past_due" }), now).tier).toBe("paid");
    const tomorrow = new Date(now.getTime() + 86_400_000);
    expect(entitlementsOf(plan({ status: "trialing", currentPeriodEnd: tomorrow }), now).tier).toBe(
      "paid",
    );
    expect(entitlementsOf(plan({ status: "trialing", currentPeriodEnd: now }), now).tier).toBe(
      "free",
    );
  });

  it("tell a paid tier from free", () => {
    expect(isPaidTier("paid")).toBe(true);
    expect(isPaidTier("free")).toBe(false);
  });
});

describe("featuresOfTier", () => {
  it("lists what a tier grants, the inherited features included, and nothing for free", async () => {
    const { featuresOfTier } = await import("./entitlements");
    expect([...featuresOfTier("free")]).toEqual([]);
    expect(featuresOfTier("paid").has("premium")).toBe(true);
  });
});

describe("plan limits", () => {
  it("give each tier its own allowance and window, the paid tier's over the one it extends", () => {
    expect(entitlementsOf(null, now).limits.exports).toEqual({ limit: 5, windowSeconds: 86_400 });
    expect(entitlementsOf(plan(), now).limits.exports).toEqual({
      limit: 50,
      windowSeconds: 86_400,
    });
  });

  it("fall back to the free allowance when a plan no longer counts", () => {
    expect(entitlementsOf(plan({ status: "canceled" }), now).limits.exports?.limit).toBe(5);
  });
});

describe("the lookup keys prices are found by", () => {
  it("name a price for each way of buying the sold tier, and none for what is not sold", async () => {
    const { catalog, lookupKeyOf } = await import("./catalog");
    for (const interval of ["monthly", "yearly", "lifetime"]) {
      expect(lookupKeyOf(catalog.paidTier, interval)).toBe(`${catalog.paidTier}_${interval}`);
    }
    expect(lookupKeyOf("free", "monthly")).toBeUndefined();
    expect(lookupKeyOf("paid", "weekly")).toBeUndefined();
  });
});
