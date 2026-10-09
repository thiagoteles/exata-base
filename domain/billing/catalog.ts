/*
 * The plans the product sells, filled in by the product. Each tier names the features it grants
 * and its usage limits, and may extend another tier to inherit both. `free` always exists: it is
 * what anyone without a paid plan has. Tier names are stored in the database as an enum built
 * from this list, so renaming or removing a tier needs a migration.
 */

export type TierDefinition = {
  extends?: string;
  features: readonly string[];
  limits: Readonly<Record<string, number>>;
};

export const catalog = {
  tiers: {
    free: { features: [], limits: {} },
    paid: { extends: "free", features: ["premium"], limits: {} },
  },
  /** The tier the checkout sells and a courtesy grants, until prices name their own tier. */
  paidTier: "paid",
} as const satisfies {
  tiers: { free: TierDefinition } & Record<string, TierDefinition>;
  paidTier: string;
};
