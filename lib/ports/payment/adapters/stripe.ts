import Stripe from "stripe";
import { billingInterval } from "@/lib/db/schema/billing";
import { DomainError } from "@/lib/errors";
import type { Interval, PaymentEvent, PaymentGateway } from "../types";

/*
 * Stripe behind the payment port. Checkout is a one-off payment for a lifetime plan and a
 * subscription for a monthly or yearly one; the interval travels in the session's metadata, so the
 * webhook never has to guess it from a price.
 */

type Options = { secretKey: string; webhookSecret: string };

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;
const PIX_MENTION = /pix/i;
/** How long a Pix code can be paid after the checkout opens. */
const PIX_EXPIRES_AFTER_SECONDS = 3600;

const isInterval = (value: unknown): value is Interval =>
  typeof value === "string" && (billingInterval.enumValues as readonly string[]).includes(value);

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  typeof value === "string" ? value : (value?.id ?? null);

/** The end of the trial this checkout started: the days we asked for, counted from the confirmation. */
function trialEndOf(session: Stripe.Checkout.Session, createdSeconds: number): Date | null {
  const days = Number(session.metadata?.["trial_days"] ?? 0);
  return Number.isFinite(days) && days > 0
    ? new Date((createdSeconds + days * SECONDS_PER_DAY) * MS_PER_SECOND)
    : null;
}

type CheckoutRequestShape = Parameters<PaymentGateway["createCheckout"]>[0];

/** What a purchase asks of Stripe: a payment for a one-off plan, a subscription (with its trial) for the rest. */
function checkoutParams(request: CheckoutRequestShape) {
  const oneOff = request.interval === "lifetime" || request.interval === "yearly_once";
  const trialDays = oneOff ? 0 : (request.trialDays ?? 0);
  const params = {
    mode: oneOff ? "payment" : "subscription",
    line_items: [{ price: request.priceId, quantity: 1 }],
    ...(request.currency === undefined ? {} : { currency: request.currency }),
    client_reference_id: request.userId,
    metadata: {
      interval: request.interval,
      ...(trialDays > 0 ? { trial_days: String(trialDays) } : {}),
    },
    ...(trialDays > 0 ? { subscription_data: { trial_period_days: trialDays } } : {}),
    success_url: request.successUrl,
    cancel_url: request.cancelUrl,
    ...(request.customerId === null
      ? { customer_email: request.email, ...(oneOff ? { customer_creation: "always" } : {}) }
      : { customer: request.customerId }),
  } satisfies Stripe.Checkout.SessionCreateParams;
  return { params, oneOff };
}

function checkoutEvent(event: Stripe.Event, session: Stripe.Checkout.Session): PaymentEvent {
  const base = { id: event.id, type: event.type, provider: "stripe" as const };
  const interval = session.metadata?.["interval"];
  const userId = session.client_reference_id;
  if (userId === null || !isInterval(interval)) {
    return { ...base, kind: "ignored" };
  }
  // An asynchronous payment (Pix, a bank slip) completes the session before the money arrives. It is
  // recorded as waiting; the matching succeeded event is the one that grants the plan.
  if (session.payment_status === "unpaid") {
    return { ...base, kind: "checkout_pending", sessionId: session.id, userId, interval };
  }
  return {
    ...base,
    kind: "checkout_paid",
    sessionId: session.id,
    userId,
    customerId: idOf(session.customer),
    subscriptionId: idOf(session.subscription),
    interval,
    paidAt: new Date(event.created * MS_PER_SECOND),
    trialEndsAt: trialEndOf(session, event.created),
  };
}

/** The latest end among the invoice's lines: when the period just paid runs out. */
function periodEndOf(invoice: Stripe.Invoice): Date | null {
  const ends = invoice.lines.data.map((line) => line.period.end);
  return ends.length === 0 ? null : new Date(Math.max(...ends) * MS_PER_SECOND);
}

function invoiceEvent(
  event: Stripe.Event,
  invoice: Stripe.Invoice,
  kind: "invoice_paid" | "invoice_failed",
): PaymentEvent {
  const base = { id: event.id, type: event.type, provider: "stripe" as const };
  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
  if (subscriptionId === null) {
    return { ...base, kind: "ignored" };
  }
  return kind === "invoice_paid"
    ? { ...base, kind, subscriptionId, periodEnd: periodEndOf(invoice) }
    : { ...base, kind, subscriptionId };
}

function chargeSucceeded(event: Stripe.Event, charge: Stripe.Charge): PaymentEvent {
  return {
    id: event.id,
    type: event.type,
    provider: "stripe",
    kind: "payment_succeeded",
    paymentId: charge.id,
    customerId: idOf(charge.customer),
    email: charge.billing_details.email ?? charge.receipt_email ?? null,
    amountCents: charge.amount,
    currency: charge.currency.toLowerCase(),
    method: charge.payment_method_details?.type ?? null,
    paidAt: new Date(charge.created * MS_PER_SECOND),
  };
}

function toPaymentEvent(event: Stripe.Event): PaymentEvent {
  const base = { id: event.id, type: event.type, provider: "stripe" as const };
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return checkoutEvent(event, event.data.object);
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const { client_reference_id: userId, id: sessionId } = event.data.object;
      return userId === null
        ? { ...base, kind: "ignored" }
        : {
            ...base,
            kind: "checkout_failed",
            sessionId,
            userId,
            expired: event.type === "checkout.session.expired",
          };
    }
    case "charge.dispute.created": {
      const paymentId = idOf(event.data.object.charge);
      return paymentId === null
        ? { ...base, kind: "ignored" }
        : {
            ...base,
            kind: "dispute_created",
            paymentId,
            amountCents: event.data.object.amount,
            reason: event.data.object.reason,
          };
    }
    case "customer.subscription.trial_will_end": {
      const { trial_end: trialEnd, id } = event.data.object;
      return trialEnd === null
        ? { ...base, kind: "ignored" }
        : {
            ...base,
            kind: "trial_ending",
            subscriptionId: id,
            endsAt: new Date(trialEnd * MS_PER_SECOND),
          };
    }
    case "invoice.payment_succeeded":
      return invoiceEvent(event, event.data.object, "invoice_paid");
    case "invoice.payment_failed":
      return invoiceEvent(event, event.data.object, "invoice_failed");
    case "charge.succeeded":
      return chargeSucceeded(event, event.data.object);
    case "customer.subscription.deleted":
      return { ...base, kind: "subscription_deleted", subscriptionId: event.data.object.id };
    case "charge.refunded": {
      const customerId = idOf(event.data.object.customer);
      return customerId === null
        ? { ...base, kind: "ignored" }
        : {
            ...base,
            kind: "charge_refunded",
            paymentId: event.data.object.id,
            customerId,
            fullyRefunded: event.data.object.refunded,
            refundedCents: event.data.object.amount_refunded,
          };
    }
    case "price.created":
    case "price.updated":
    case "price.deleted":
      return { ...base, kind: "prices_changed" };
    default:
      return { ...base, kind: "ignored" };
  }
}

export function createStripeGateway({ secretKey, webhookSecret }: Options): PaymentGateway {
  const stripe = new Stripe(secretKey);
  return {
    readEvent: (body, signature) =>
      toPaymentEvent(stripe.webhooks.constructEvent(body, signature, webhookSecret)),

    async createCheckout(request) {
      const { params, oneOff } = checkoutParams(request);
      // Which methods a checkout offers (card, Pix) is set in the provider's dashboard. A Pix code
      // that is not paid in time stops being valid, and for how long is ours to say. An account that
      // has Pix off refuses that option, and the checkout then goes on without it.
      const session = oneOff
        ? await stripe.checkout.sessions
            .create({
              ...params,
              payment_method_options: { pix: { expires_after_seconds: PIX_EXPIRES_AFTER_SECONDS } },
            })
            .catch((error: unknown) => {
              if (
                error instanceof Stripe.errors.StripeInvalidRequestError &&
                PIX_MENTION.test(error.message)
              ) {
                return stripe.checkout.sessions.create(params);
              }
              throw error;
            })
        : await stripe.checkout.sessions.create(params);
      if (session.url === null) {
        throw new Error("the checkout session has no address");
      }
      return { url: session.url, sessionId: session.id };
    },

    async createPortal(customerId, returnUrl) {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return session.url;
    },

    async setCancelAtPeriodEnd(subscriptionId, cancel) {
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: cancel });
    },

    async cancelSubscription(subscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscriptionId, { prorate: false });
      } catch (error) {
        if (
          error instanceof Stripe.errors.StripeInvalidRequestError &&
          error.code === "resource_missing"
        ) {
          return;
        }
        throw error;
      }
    },

    async refundLastPayment(customerId, idempotencyKey) {
      const charges = await stripe.charges.list({ customer: customerId, limit: 10 });
      const charge = charges.data.find((candidate) => candidate.paid && !candidate.refunded);
      if (charge === undefined) {
        throw new DomainError(409, "nothingToRefund");
      }
      await stripe.refunds.create({ charge: charge.id }, { idempotencyKey });
    },

    async readPrices(lookupKeys) {
      if (lookupKeys.length === 0) {
        return [];
      }
      const prices = await stripe.prices.list({
        lookup_keys: [...lookupKeys],
        active: true,
        limit: lookupKeys.length,
        expand: ["data.currency_options"],
      });
      return prices.data.flatMap((price) =>
        price.unit_amount === null || price.lookup_key === null
          ? []
          : [
              {
                priceId: price.id,
                lookupKey: price.lookup_key,
                cents: price.unit_amount,
                currency: price.currency,
                options: Object.fromEntries(
                  Object.entries(price.currency_options ?? {}).flatMap(([code, option]) =>
                    option.unit_amount === null || option.unit_amount === undefined
                      ? []
                      : [[code.toLowerCase(), option.unit_amount] as const],
                  ),
                ),
              },
            ],
      );
    },
  };
}
