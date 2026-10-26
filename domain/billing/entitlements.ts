import { catalog } from "./catalog";
import type { CatalogShape, LimitRule } from "./catalog-shape";

/*
 * What a holder may do, from the plan alone. A plan grants its tier while it is active, on trial
 * or failing a charge (a failed charge keeps access until the provider ends the subscription). A
 * pending payment, a canceled plan or a trial that already ended grant the free tier.
 */

type TierOf<C extends CatalogShape> = keyof C["tiers"] & string;
type FeatureOf<C extends CatalogShape> = C["tiers"][TierOf<C>]["features"][number];
type LimitNameOf<C extends CatalogShape> = {
  [T in TierOf<C>]: keyof C["tiers"][T]["limits"];
}[TierOf<C>];

type Catalog = typeof catalog;
export type Tier = TierOf<Catalog>;
export type Feature = FeatureOf<Catalog>;
/** Every limit any tier names. A limit only some tiers name is unlimited for the others. */
export type LimitName = LimitNameOf<Catalog>;

/** Who holds the rights. Today always a person; an organization joins without changing callers. */
export type Holder = { kind: "user"; id: string };

type PlanStateFor<T extends string> = {
  tier: T;
  /** Bought for a fixed term: with no renewal, it grants nothing once `currentPeriodEnd` has passed. */
  fixedTerm?: boolean;
  status: "active" | "canceled" | "past_due" | "trialing" | "pending";
  currentPeriodEnd: Date | null;
};
export type PlanState = PlanStateFor<Tier>;

type EntitlementsFor<C extends CatalogShape> = {
  tier: TierOf<C>;
  features: ReadonlySet<FeatureOf<C>>;
  limits: Readonly<Partial<Record<LimitNameOf<C>, LimitRule>>>;
};
export type Entitlements = EntitlementsFor<Catalog>;

/** A tier other than free: one that was bought or given. */
export const isPaidTier = (tier: Tier): boolean => tier !== "free";

function grantedTier<T extends string>(plan: PlanStateFor<T> | null, now: Date): T | "free" {
  if (plan === null || plan.status === "pending" || plan.status === "canceled") {
    return "free";
  }
  const trialEnded =
    plan.status === "trialing" &&
    plan.currentPeriodEnd !== null &&
    plan.currentPeriodEnd.getTime() <= now.getTime();
  const termEnded =
    plan.fixedTerm === true &&
    plan.currentPeriodEnd !== null &&
    plan.currentPeriodEnd.getTime() <= now.getTime();
  return trialEnded || termEnded ? "free" : plan.tier;
}

/**
 * The rules above read from a given catalog, so the paths a product with several tiers takes can be
 * proven against a catalog of that shape even where the product's own catalog has fewer.
 */
export function entitlementsWith<C extends CatalogShape>(source: C) {
  type T = TierOf<C>;
  type F = FeatureOf<C>;
  type Resolved = Omit<EntitlementsFor<C>, "tier">;

  function resolve(tier: T, seen: ReadonlySet<T> = new Set()): Resolved {
    const definition: { extends?: string; features: readonly string[]; limits: object } =
      source.tiers[tier];
    const parent = definition.extends as T | undefined;
    const inherited: Resolved =
      parent === undefined || seen.has(parent)
        ? { features: new Set<F>(), limits: {} as Resolved["limits"] }
        : resolve(parent, new Set([...seen, tier]));
    return {
      features: new Set([...inherited.features, ...(definition.features as readonly F[])]),
      limits: { ...inherited.limits, ...definition.limits },
    };
  }

  const featuresOfTier = (tier: T): ReadonlySet<F> => resolve(tier).features;

  return {
    tierNames: Object.keys(source.tiers) as [T, ...T[]],
    /** Every feature a tier grants, the ones it inherits included. For screens that compare plans. */
    featuresOfTier,
    /**
     * The first feature the sold tier grants, whatever the product calls it: what shows a gate at
     * work (the catalog's paid block) and what the tests open and close, without naming a feature.
     */
    firstPaidFeature: [...featuresOfTier(source.paidTier as T)][0] as F | undefined,
    entitlementsOf(plan: PlanStateFor<T> | null, now: Date): EntitlementsFor<C> {
      const tier = grantedTier(plan, now) as T;
      return { tier, ...resolve(tier) };
    },
  };
}

export const { tierNames, featuresOfTier, firstPaidFeature, entitlementsOf } =
  entitlementsWith(catalog);
