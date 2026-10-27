import type { CatalogShape } from "./catalog-shape";

/*
 * The plans the product sells, filled in by the product, which owns this file. Each tier names the
 * features it grants and its usage limits, and may extend another tier to inherit both. `free`
 * always exists: it is what anyone without a paid plan has. Tier names are stored in the database
 * as an enum: after adding a tier, `pnpm db:tiers` writes the migration that adds it, and renaming or
 * removing one needs a migration written by hand. A product that
 * declares more than the shape asks for widens the `satisfies` below with its own fields.
 */

export const catalog = {
  tiers: {
    // `exports` is the neutral example: how many times a day a person may download their data. A
    // product replaces it with what it meters (reports, messages, jobs); a tier that does not name a
    // limit inherits the one it extends, and a limit no tier names is unlimited. `per: "day"` starts
    // again at midnight in the product's time zone; `windowSeconds` counts fixed windows instead.
    free: { features: [], limits: { exports: { limit: 5, per: "day" } } },
    paid: {
      extends: "free",
      features: ["premium"],
      limits: { exports: { limit: 50, per: "day" } },
    },
  },
  /**
   * How each way of buying a tier is found at the payment provider: `<tier>.<interval>` names a
   * price by its lookup key, so a price can be replaced in the provider's dashboard without a deploy
   * and without an id copied into the environment. Only what is listed here, and exists at the
   * provider, is offered.
   */
  prices: {
    "paid.monthly": "paid_monthly",
    "paid.yearly": "paid_yearly",
    "paid.yearly_once": "paid_yearly_once",
    "paid.lifetime": "paid_lifetime",
  },
  /**
   * The currency prices are shown in by default, and the ones the product offers a person to choose
   * from. A currency is offered only where every price carries it (a price's currency options are set at
   * the provider). Start with the default alone; add a code when the prices have it.
   */
  currencies: { default: "brl", offered: ["brl"] },
  /**
   * A free trial before the first charge: how many days, and for which ways of buying (only a
   * subscription can have one). `days: 0` turns it off. Each account gets one, ever.
   */
  trial: { days: 14, intervals: ["monthly", "yearly"] },
  /**
   * What an invitation earns the person who made it, when the invited person pays for the first time:
   * a credit on their next invoice, in the default currency. `cents: 0` turns it off.
   */
  referralCredit: { cents: 1000 },
  /** Lets a person type a promotion code (made in the provider's dashboard) at checkout. */
  allowPromotionCodes: true,
  /**
   * The default tier: what a courtesy grants, and what the checkout sells when a purchase names no
   * tier. A product that sells several tiers names each in `prices`; people move between them in the
   * provider's customer portal.
   */
  paidTier: "paid",
} as const satisfies CatalogShape;
