import { describe, expect, it } from "vitest";
import { priceKeyOfLookup, soldTiers } from "./catalog";
import { twoTierCatalog } from "./catalog.fixture";

describe("the tiers and prices a catalog sells", () => {
  // Fails when a portal switch to a listed price is read as an unknown one, or the reverse.
  it("tell which tier and interval each lookup key sells, and nothing for a key it does not list", () => {
    expect(priceKeyOfLookup(twoTierCatalog, "plus_monthly")).toEqual({
      tier: "plus",
      interval: "monthly",
    });
    expect(priceKeyOfLookup(twoTierCatalog, "plus_yearly")).toEqual({
      tier: "plus",
      interval: "yearly",
    });
    expect(priceKeyOfLookup(twoTierCatalog, "team_monthly")).toEqual({
      tier: "team",
      interval: "monthly",
    });
    expect(priceKeyOfLookup(twoTierCatalog, "team_yearly")).toBeNull();
  });

  it("list the tiers with a price, in the catalog's order, never free", () => {
    expect(soldTiers(twoTierCatalog)).toEqual(["plus", "team"]);
  });
});
