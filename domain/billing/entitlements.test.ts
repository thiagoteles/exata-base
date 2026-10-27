import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { twoTierCatalog } from "./catalog.fixture";
import { entitlementsWith, isPaidTier } from "./entitlements";

/*
 * The rules are proven on a fixed catalog (`twoTierCatalog`), so they hold whatever tiers a product
 * sells; the product's own catalog is checked only for what every catalog must say.
 */

const now = new Date("2026-06-01T12:00:00Z");
const {
  entitlementsOf: of,
  featuresOfTier,
  firstPaidFeature,
  tierNames,
} = entitlementsWith(twoTierCatalog);
type FixturePlan = NonNullable<Parameters<typeof of>[0]>;
const plan = (over: Partial<FixturePlan> = {}): FixturePlan => ({
  tier: "plus",
  status: "active",
  currentPeriodEnd: null,
  ...over,
});

describe("entitlements", () => {
  it("grant the tier's features, including the ones it extends", () => {
    const plus = of(plan(), now);
    expect(plus.tier).toBe("plus");
    expect(plus.features.has("history")).toBe(true);
  });

  it("grant free with no plan, a pending payment or a canceled plan", () => {
    expect(of(null, now).features.size).toBe(0);
    expect(of(plan({ status: "pending" }), now).tier).toBe("free");
    expect(of(plan({ status: "canceled" }), now).tier).toBe("free");
  });

  it("keep the tier while a charge fails and while a trial runs, not after it ends", () => {
    expect(of(plan({ status: "past_due" }), now).tier).toBe("plus");
    const tomorrow = new Date(now.getTime() + 86_400_000);
    expect(of(plan({ status: "trialing", currentPeriodEnd: tomorrow }), now).tier).toBe("plus");
    expect(of(plan({ status: "trialing", currentPeriodEnd: now }), now).tier).toBe("free");
  });

  it("tell a paid tier from free", () => {
    expect(isPaidTier(catalog.paidTier)).toBe(true);
    expect(isPaidTier("free")).toBe(false);
  });
});

describe("featuresOfTier", () => {
  it("lists what a tier grants, the inherited features included, and nothing for free", () => {
    expect([...featuresOfTier("free")]).toEqual([]);
    expect([...featuresOfTier("team")].sort()).toEqual(["history", "sharing"]);
  });
});

describe("plan limits", () => {
  it("give each tier its own allowance and window, the paid tier's over the one it extends", () => {
    expect(of(null, now).limits.exports).toEqual(twoTierCatalog.tiers.free.limits.exports);
    expect(of(plan(), now).limits.exports).toEqual(twoTierCatalog.tiers.plus.limits.exports);
  });

  it("fall back to the free allowance when a plan no longer counts", () => {
    expect(of(plan({ status: "canceled" }), now).limits.exports).toEqual(
      twoTierCatalog.tiers.free.limits.exports,
    );
  });
});

describe("a catalog with two paid tiers", () => {
  // Fails when a tier stops inheriting what the tier it extends grants.
  it("grants the higher tier what it extends, its own features and limits over the inherited", () => {
    const team = of({ tier: "team", status: "active", currentPeriodEnd: null }, now);
    expect([...team.features].sort()).toEqual(["history", "sharing"]);
    expect(team.limits).toEqual({
      exports: { limit: 50, windowSeconds: 86_400 },
      seats: { limit: 10, windowSeconds: 86_400 },
    });
  });

  it("reads the sold tier and the tier list from that catalog, not the product's", () => {
    expect(firstPaidFeature).toBe("history");
    expect(tierNames).toEqual(["free", "plus", "team"]);
  });
});

describe("the lookup keys prices are found by", () => {
  it("name a price for each way of buying a tier the catalog sells, and none for what it does not", async () => {
    const { lookupKeyOf } = await import("./catalog");
    for (const [sold, key] of Object.entries(catalog.prices)) {
      const [tier = "", interval = ""] = sold.split(".");
      expect(lookupKeyOf(tier, interval)).toBe(key);
    }
    expect(lookupKeyOf("free", "monthly")).toBeUndefined();
    expect(lookupKeyOf(catalog.paidTier, "weekly")).toBeUndefined();
  });
});
