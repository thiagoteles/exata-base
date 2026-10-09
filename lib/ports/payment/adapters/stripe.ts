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

const isInterval = (value: unknown): value is Interval =>
  typeof value === "string" && (billingInterval.enumValues as readonly string[]).includes(value);

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  typeof value === "string" ? value : (value?.id ?? null);

function checkoutEvent(event: Stripe.Event, session: Stripe.Checkout.Session): PaymentEvent {
  const base = { id: event.id, type: event.type, provider: "stripe" as const };
  const interval = session.metadata?.["interval"];
  const userId = session.client_reference_id;
  // An asynchronous payment (such as a bank slip) completes the session before the money arrives;
  // the matching succeeded event is the one that grants the plan.
  const waiting = session.payment_status === "unpaid";
  if (waiting || userId === null || !isInterval(interval)) {
    return { ...base, kind: "ignored" };
  }
  return {
    ...base,
    kind: "checkout_paid",
    userId,
    customerId: idOf(session.customer),
    subscriptionId: idOf(session.subscription),
    interval,
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
      const lifetime = request.interval === "lifetime";
      const session = await stripe.checkout.sessions.create({
        mode: lifetime ? "payment" : "subscription",
        line_items: [{ price: request.priceId, quantity: 1 }],
        client_reference_id: request.userId,
        metadata: { interval: request.interval },
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        ...(request.customerId === null
          ? { customer_email: request.email, ...(lifetime ? { customer_creation: "always" } : {}) }
          : { customer: request.customerId }),
      });
      if (session.url === null) {
        throw new Error("the checkout session has no address");
      }
      return session.url;
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
              },
            ],
      );
    },
  };
}
