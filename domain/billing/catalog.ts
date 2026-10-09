/*
 * The plans the product sells, filled in by the product. Each tier names the features it grants
 * and its usage limits, and may extend another tier to inherit both. `free` always exists: it is
 * what anyone without a paid plan has. Tier names are stored in the database as an enum built
 * from this list, so renaming or removing a tier needs a migration.
 */

/** How much of one thing a tier allows in a window of time, such as five exports a day. */
export type LimitRule = { limit: number; windowSeconds: number };

export type TierDefinition = {
  extends?: string;
  features: readonly string[];
  limits: Readonly<Record<string, LimitRule>>;
};

const DAY = 86_400;

export const catalog = {
  tiers: {
    // `exports` is the neutral example: how many times a day a person may download their data. A
    // product replaces it with what it meters (reports, messages, jobs); a tier that does not name a
    // limit inherits the one it extends, and a limit no tier names is unlimited.
    free: { features: [], limits: { exports: { limit: 5, windowSeconds: DAY } } },
    paid: {
      extends: "free",
      features: ["premium"],
      limits: { exports: { limit: 50, windowSeconds: DAY } },
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
    "paid.lifetime": "paid_lifetime",
  },
  /** The tier the checkout sells and a courtesy grants, until prices name their own tier. */
  paidTier: "paid",
} as const satisfies {
  tiers: { free: TierDefinition } & Record<string, TierDefinition>;
  prices: Readonly<Record<string, string>>;
  paidTier: string;
};

/** The lookup key a tier is sold under for an interval, or undefined when it is not sold that way. */
export function lookupKeyOf(tier: string, interval: string): string | undefined {
  return (catalog.prices as Readonly<Record<string, string>>)[`${tier}.${interval}`];
}
