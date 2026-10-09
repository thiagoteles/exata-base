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
  /** The tier the checkout sells and a courtesy grants, until prices name their own tier. */
  paidTier: "paid",
} as const satisfies {
  tiers: { free: TierDefinition } & Record<string, TierDefinition>;
  paidTier: string;
};
