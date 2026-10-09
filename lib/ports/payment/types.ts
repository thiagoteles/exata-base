import type { billingInterval, paymentProvider } from "@/lib/db/schema/billing";

export type Interval = (typeof billingInterval.enumValues)[number];
type PaymentProvider = (typeof paymentProvider.enumValues)[number];

/*
 * What a payment provider tells us, reduced to the facts the app acts on. The adapter turns the
 * provider's own events into these, so the billing rules never see a provider type.
 */
export type PaymentEvent = { id: string; type: string; provider: PaymentProvider } & (
  | {
      kind: "checkout_paid";
      userId: string;
      customerId: string | null;
      subscriptionId: string | null;
      interval: Interval;
    }
  | { kind: "invoice_paid"; subscriptionId: string; periodEnd: Date | null }
  | { kind: "invoice_failed"; subscriptionId: string }
  | { kind: "subscription_deleted"; subscriptionId: string }
  | { kind: "charge_refunded"; customerId: string; fullyRefunded: boolean }
  | { kind: "ignored" }
);

type CheckoutRequest = {
  userId: string;
  email: string;
  customerId: string | null;
  interval: Interval;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

export type PriceTag = { priceId: string; cents: number; currency: string };

/** The shape every payment provider implements. */
export type PaymentGateway = {
  /** Checks the signature on the raw body and reads the event. Throws when it does not match. */
  readEvent: (body: string, signature: string) => PaymentEvent;
  createCheckout: (request: CheckoutRequest) => Promise<string>;
  createPortal: (customerId: string, returnUrl: string) => Promise<string>;
  setCancelAtPeriodEnd: (subscriptionId: string, cancel: boolean) => Promise<void>;
  /** Ends a subscription now, with no credit for the unused time. A subscription already gone is fine. */
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  /** Refunds the customer's latest paid charge in full. The key makes a repeated request one refund. */
  refundLastPayment: (customerId: string, idempotencyKey: string) => Promise<void>;
  readPrices: (priceIds: readonly string[]) => Promise<PriceTag[]>;
};
