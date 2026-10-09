import { cacheLife, cacheTag } from "next/cache";
import { catalog, lookupKeyOf } from "@/domain/billing/catalog";
import { cacheTags } from "@/lib/cache-tags";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import type { Interval, PaymentGateway, PriceTag } from "./types";

/*
 * The payment port. Without STRIPE_SECRET_KEY there is no provider: no price is offered and no
 * checkout opens, while the plan rules (who has paid, courtesy) keep working. Pages, actions and
 * routes see this module, never the provider's SDK.
 */

const intervalOrder: readonly Interval[] = ["monthly", "yearly", "yearly_once", "lifetime"];

/** Whether billing is set up at all: the provider's keys are there. Prices are read from it separately. */
export function billingConfigured(): boolean {
  return env.STRIPE_SECRET_KEY !== undefined && env.STRIPE_WEBHOOK_SECRET !== undefined;
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

/**
 * What each way of buying the sold tier costs, read from the provider by the lookup keys the plan
 * catalog declares, and kept for an hour. An interval whose key has no active price at the provider
 * is not in the answer, so it is not offered. The webhook expires this when a price changes.
 */
export async function readPrices(): Promise<Partial<Record<Interval, PriceTag>>> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.prices());
  const current = await paymentGateway();
  if (current === null) {
    return {};
  }
  const keys = Object.fromEntries(
    intervalOrder.flatMap((interval) => {
      const key = lookupKeyOf(catalog.paidTier, interval);
      return key === undefined ? [] : [[interval, key] as const];
    }),
  );
  const tags = await current.readPrices(Object.values(keys));
  return Object.fromEntries(
    intervalOrder.flatMap((interval) => {
      const tag = tags.find((candidate) => candidate.lookupKey === keys[interval]);
      return tag === undefined ? [] : [[interval, tag] as const];
    }),
  );
}

/** The ways of buying the sold tier that exist right now, in the order they are shown. */
export async function offeredIntervals(): Promise<Interval[]> {
  const prices = await readPrices();
  return intervalOrder.filter((interval) => prices[interval] !== undefined);
}
