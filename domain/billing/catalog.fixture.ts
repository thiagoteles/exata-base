import type { CatalogShape } from "./catalog-shape";

/*
 * A catalog with two paid tiers, one extending the other, for the tests: the product's own catalog
 * may sell a single tier, and the paths that tell tiers apart must still be proven.
 */

const DAY = 86_400;

export const twoTierCatalog = {
  tiers: {
    free: { features: [], limits: { exports: { limit: 5, windowSeconds: DAY } } },
    plus: {
      extends: "free",
      features: ["history"],
      limits: { exports: { limit: 50, windowSeconds: DAY } },
    },
    team: {
      extends: "plus",
      features: ["sharing"],
      limits: { seats: { limit: 10, windowSeconds: DAY } },
    },
  },
  prices: {
    "plus.monthly": "plus_monthly",
    "plus.yearly": "plus_yearly",
    "team.monthly": "team_monthly",
  },
  currencies: { default: "brl", offered: ["brl"] },
  trial: { days: 0, intervals: [] },
  referralCredit: { cents: 0 },
  allowPromotionCodes: false,
  paidTier: "plus",
} as const satisfies CatalogShape;
