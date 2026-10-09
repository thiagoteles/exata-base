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
