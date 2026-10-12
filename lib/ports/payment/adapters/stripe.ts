import Stripe from "stripe";
import { catalog } from "@/domain/billing/catalog";
import { DomainError } from "@/lib/errors";
import type { PaymentGateway } from "../types";
import { toPaymentEvent } from "./stripe-events";

/*
 * Stripe behind the payment port. Checkout is a one-off payment for a lifetime plan and a
 * subscription for a monthly or yearly one; the interval travels in the session's metadata, so the
 * webhook never has to guess it from a price.
 */

type Options = { secretKey: string; webhookSecret: string };

const PIX_MENTION = /pix/i;
/** How long a Pix code can be paid after the checkout opens. */
const PIX_EXPIRES_AFTER_SECONDS = 3600;

type CheckoutRequestShape = Parameters<PaymentGateway["createCheckout"]>[0];

/** What a purchase asks of Stripe: a payment for a one-off plan, a subscription (with its trial) for the rest. */
function checkoutParams(request: CheckoutRequestShape) {
  const oneOff = request.interval === "lifetime" || request.interval === "yearly_once";
  const trialDays = oneOff ? 0 : (request.trialDays ?? 0);
  const params = {
    mode: oneOff ? "payment" : "subscription",
    line_items: [{ price: request.priceId, quantity: 1 }],
    ...(request.currency === undefined ? {} : { currency: request.currency }),
    ...(catalog.allowPromotionCodes ? { allow_promotion_codes: true } : {}),
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

    async grantCredit(request) {
      const customerId =
        request.customerId ??
        (
          await stripe.customers.create(
            { email: request.email, metadata: { user_id: request.userId } },
            { idempotencyKey: `${request.idempotencyKey}:customer` },
          )
        ).id;
      // A negative amount on the balance is a credit: it is spent on the next invoice.
      await stripe.customers.createBalanceTransaction(
        customerId,
        {
          amount: -request.cents,
          currency: request.currency,
          description: request.description,
        },
        { idempotencyKey: request.idempotencyKey },
      );
      return { customerId };
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
