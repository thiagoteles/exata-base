import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import type { Interval, PaymentGateway, PriceTag } from "./types";

/*
 * The payment port. Without STRIPE_SECRET_KEY there is no provider: no price is offered and no
 * checkout opens, while the plan rules (who has paid, courtesy) keep working. Pages, actions and
 * routes see this module, never the provider's SDK.
 */

export const priceIds: Readonly<Record<Interval, string | undefined>> = {
  monthly: env.STRIPE_PRICE_MONTHLY,
  yearly: env.STRIPE_PRICE_YEARLY,
  lifetime: env.STRIPE_PRICE_LIFETIME,
};

const intervalOrder: readonly Interval[] = ["monthly", "yearly", "lifetime"];

/** The intervals that can be bought right now: the provider is on and the price is set. */
export function offeredIntervals(): Interval[] {
  if (env.STRIPE_SECRET_KEY === undefined) {
    return [];
  }
  return intervalOrder.filter((interval) => priceIds[interval] !== undefined);
}

let gateway: Promise<PaymentGateway | null> | undefined;

async function loadGateway(): Promise<PaymentGateway | null> {
  if (env.STRIPE_SECRET_KEY === undefined || env.STRIPE_WEBHOOK_SECRET === undefined) {
    return null;
  }
  const { createStripeGateway } = await import("./adapters/stripe");
  return createStripeGateway({
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  });
}

/** The provider, or null when billing is off. */
export function paymentGateway(): Promise<PaymentGateway | null> {
  gateway ??= loadGateway();
  return gateway;
}

/** The provider, or a 404 for a request that only makes sense with billing on. */
export async function requireGateway(): Promise<PaymentGateway> {
  const current = await paymentGateway();
  if (current === null) {
    throw new DomainError(404, "billingOff");
  }
  return current;
}

/** What each offered plan costs, read from the provider and kept for an hour. */
export async function readPrices(): Promise<Partial<Record<Interval, PriceTag>>> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.prices());
  const current = await paymentGateway();
  const wanted = offeredIntervals();
  if (current === null || wanted.length === 0) {
    return {};
  }
  const ids = wanted.map((interval) => priceIds[interval] ?? "");
  const tags = await current.readPrices(ids);
  return Object.fromEntries(
    wanted.flatMap((interval) => {
      const tag = tags.find((candidate) => candidate.priceId === priceIds[interval]);
      return tag === undefined ? [] : [[interval, tag] as const];
    }),
  );
}
