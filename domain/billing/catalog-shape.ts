/*
 * The shape of the plans the product sells. The plans themselves are the product's, in its own
 * catalog file; this is what that file must say.
 */

/** How much of one thing a tier allows in a window of time, such as five exports a day. */
export type LimitRule = { limit: number; windowSeconds: number };

type TierDefinition = {
  extends?: string;
  features: readonly string[];
  limits: Readonly<Record<string, LimitRule>>;
};

export type CatalogShape = {
  tiers: { free: TierDefinition } & Record<string, TierDefinition>;
  prices: Readonly<Record<string, string>>;
  currencies: { default: string; offered: readonly string[] };
  trial: { days: number; intervals: readonly string[] };
  referralCredit: { cents: number };
  allowPromotionCodes: boolean;
  paidTier: string;
};
