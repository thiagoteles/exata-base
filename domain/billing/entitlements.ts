import { catalog, type LimitRule } from "./catalog";

/*
 * What a holder may do, from the plan alone. A plan grants its tier while it is active, on trial
 * or failing a charge (a failed charge keeps access until the provider ends the subscription). A
 * pending payment, a canceled plan or a trial that already ended grant the free tier.
 */

type Tiers = typeof catalog.tiers;
export type Tier = keyof Tiers;
export type Feature = Tiers[Tier]["features"][number];
/** Every limit any tier names. A limit only some tiers name is unlimited for the others. */
export type LimitName = { [T in Tier]: keyof Tiers[T]["limits"] }[Tier];

export const tierNames = Object.keys(catalog.tiers) as [Tier, ...Tier[]];

/** Who holds the rights. Today always a person; an organization joins without changing callers. */
export type Holder = { kind: "user"; id: string };

export type PlanState = {
  tier: Tier;
  status: "active" | "canceled" | "past_due" | "trialing" | "pending";
  currentPeriodEnd: Date | null;
};

export type Entitlements = {
  tier: Tier;
  features: ReadonlySet<Feature>;
  limits: Readonly<Partial<Record<LimitName, LimitRule>>>;
};

/** A tier other than free: one that was bought or given. */
export const isPaidTier = (tier: Tier): boolean => tier !== "free";

function resolve(tier: Tier, seen: ReadonlySet<Tier> = new Set()): Omit<Entitlements, "tier"> {
  const definition: { extends?: string; features: readonly string[]; limits: object } =
    catalog.tiers[tier];
  const parent = definition.extends as Tier | undefined;
  const inherited =
    parent === undefined || seen.has(parent)
      ? { features: new Set<Feature>(), limits: {} }
      : resolve(parent, new Set([...seen, tier]));
  return {
    features: new Set([...inherited.features, ...(definition.features as readonly Feature[])]),
    limits: { ...inherited.limits, ...definition.limits },
  };
}

/** Every feature a tier grants, the ones it inherits included. For screens that compare plans. */
export const featuresOfTier = (tier: Tier): ReadonlySet<Feature> => resolve(tier).features;

function grantedTier(plan: PlanState | null, now: Date): Tier {
  if (plan === null || plan.status === "pending" || plan.status === "canceled") {
    return "free";
  }
  const trialEnded =
    plan.status === "trialing" &&
    plan.currentPeriodEnd !== null &&
    plan.currentPeriodEnd.getTime() <= now.getTime();
  return trialEnded ? "free" : plan.tier;
}

export function entitlementsOf(plan: PlanState | null, now: Date): Entitlements {
  const tier = grantedTier(plan, now);
  return { tier, ...resolve(tier) };
}
