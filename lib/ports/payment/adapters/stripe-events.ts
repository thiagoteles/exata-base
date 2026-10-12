import type Stripe from "stripe";
import { billingInterval } from "@/lib/db/schema/billing";
import type { Interval, PaymentEvent } from "../types";

/*
 * What Stripe's events mean, reduced to the facts the app acts on. The gateway reads a verified event
 * through `toPaymentEvent` and the billing rules never see a Stripe type.
 */

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;

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

export function toPaymentEvent(event: Stripe.Event): PaymentEvent {
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
