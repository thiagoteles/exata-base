import { createHmac } from "node:crypto";

/*
 * Stripe events built by hand and signed the way Stripe signs them: an HMAC-SHA256 of
 * "timestamp.body" with the endpoint secret. Nothing here reaches the network.
 */

export const webhookSecret = "whsec_test_secret_for_local_events";

type Payload = Record<string, unknown>;

/** When Stripe says the event happened, in seconds: a fixed moment, so what depends on it is exact. */
export const EVENT_CREATED_SECONDS = 1_780_000_000;

function event(id: string, type: string, object: Payload): Payload {
  return {
    id,
    object: "event",
    type,
    created: EVENT_CREATED_SECONDS,
    api_version: "2025-01-01",
    data: { object },
  };
}

export function sign(payload: Payload, secret: string = webhookSecret) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return { body, signature: `t=${timestamp},v1=${digest}` };
}

export const checkoutCompleted = (
  id: string,
  session: {
    userId: string;
    interval: string;
    customer?: string;
    subscription?: string;
    paymentStatus?: string;
    /** Free days the checkout asked for, as the app writes them into the session. */
    trialDays?: number;
    /** The checkout session this belongs to, when two events are about the same one. */
    sessionId?: string;
  },
  type = "checkout.session.completed",
) =>
  event(id, type, {
    id: session.sessionId ?? `cs_${id}`,
    object: "checkout.session",
    client_reference_id: session.userId,
    metadata: {
      interval: session.interval,
      ...(session.trialDays === undefined ? {} : { trial_days: String(session.trialDays) }),
    },
    customer: session.customer ?? "cus_1",
    subscription: session.subscription ?? null,
    payment_status: session.paymentStatus ?? "paid",
  });

export const invoiceEvent = (
  id: string,
  type: string,
  subscription: string,
  periodEndSeconds = 1_900_000_000,
) =>
  event(id, type, {
    id: `in_${id}`,
    object: "invoice",
    lines: { object: "list", data: [{ period: { start: 1_897_000_000, end: periodEndSeconds } }] },
    parent: { type: "subscription_details", subscription_details: { subscription } },
  });

export const subscriptionDeleted = (id: string, subscription: string) =>
  event(id, "customer.subscription.deleted", { id: subscription, object: "subscription" });

export const chargeRefunded = (
  id: string,
  customer: string,
  fullyRefunded: boolean,
  charge = `ch_${id}`,
) =>
  event(id, "charge.refunded", {
    id: charge,
    object: "charge",
    customer,
    amount: 1000,
    refunded: fullyRefunded,
    amount_refunded: fullyRefunded ? 1000 : 300,
  });

export const chargeSucceeded = (
  id: string,
  charge: { id: string; customer: string; amount?: number; method?: string; email?: string },
) =>
  event(id, "charge.succeeded", {
    id: charge.id,
    object: "charge",
    customer: charge.customer,
    amount: charge.amount ?? 1000,
    currency: "BRL",
    created: 1_780_000_000,
    billing_details: { email: charge.email ?? null },
    receipt_email: null,
    payment_method_details: { type: charge.method ?? "card" },
  });

export const priceChanged = (
  id: string,
  type: "price.created" | "price.updated" | "price.deleted",
) => event(id, type, { id: "price_1", object: "price", lookup_key: "paid_monthly" });

/** The session ended without payment: the Pix code expired or the bank refused it, or it timed out. */
export const checkoutFailed = (
  id: string,
  userId: string,
  type:
    | "checkout.session.async_payment_failed"
    | "checkout.session.expired" = "checkout.session.async_payment_failed",
  sessionId = `cs_${id}`,
) =>
  event(id, type, {
    id: sessionId,
    object: "checkout.session",
    client_reference_id: userId,
    metadata: { interval: "yearly_once" },
    payment_status: "unpaid",
  });

export const trialWillEnd = (id: string, subscription: string, trialEndSeconds: number) =>
  event(id, "customer.subscription.trial_will_end", {
    id: subscription,
    object: "subscription",
    trial_end: trialEndSeconds,
  });

export const disputeCreated = (id: string, charge: string, amount = 1000) =>
  event(id, "charge.dispute.created", {
    id: `dp_${id}`,
    object: "dispute",
    charge,
    amount,
    reason: "fraudulent",
    status: "needs_response",
  });
