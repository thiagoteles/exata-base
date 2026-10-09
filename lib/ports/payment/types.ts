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
      sessionId: string;
      userId: string;
      customerId: string | null;
      subscriptionId: string | null;
      interval: Interval;
      /** When the provider confirmed the checkout, which is when a fixed term starts. */
      paidAt: Date;
      /** When the free trial this purchase started ends, or null when there is none. */
      trialEndsAt: Date | null;
    }
  /** The checkout was completed but the money has not arrived (Pix, a bank slip): nothing is granted yet. */
  | { kind: "checkout_pending"; sessionId: string; userId: string; interval: Interval }
  /** A pending payment will not arrive: the code expired, or the bank refused it. */
  | { kind: "checkout_failed"; sessionId: string; userId: string; expired: boolean }
  /** The customer's bank questioned a charge: the money is held and a reply is owed to the provider. */
  | { kind: "dispute_created"; paymentId: string; amountCents: number; reason: string }
  /** The trial of a subscription is about to end and the first charge is near. */
  | { kind: "trial_ending"; subscriptionId: string; endsAt: Date }
  | { kind: "invoice_paid"; subscriptionId: string; periodEnd: Date | null }
  | { kind: "invoice_failed"; subscriptionId: string }
  | { kind: "subscription_deleted"; subscriptionId: string }
  | {
      kind: "payment_succeeded";
      paymentId: string;
      customerId: string | null;
      email: string | null;
      amountCents: number;
      currency: string;
      method: string | null;
      paidAt: Date;
    }
  | {
      kind: "charge_refunded";
      paymentId: string;
      customerId: string;
      fullyRefunded: boolean;
      refundedCents: number;
    }
  /** A price was created, changed or removed at the provider: what the app cached of prices is stale. */
  | { kind: "prices_changed" }
  | { kind: "ignored" }
);

type CheckoutRequest = {
  userId: string;
  email: string;
  customerId: string | null;
  interval: Interval;
  priceId: string;
  /** Free days before the first charge, for a subscription. Absent or zero means none. */
  trialDays?: number;
  /** The currency to charge in, when the price carries it. Absent means the price's own. */
  currency?: string;
  successUrl: string;
  cancelUrl: string;
};

type CreditRequest = {
  customerId: string | null;
  email: string;
  userId: string;
  cents: number;
  currency: string;
  description: string;
  idempotencyKey: string;
};

export type PriceTag = {
  priceId: string;
  lookupKey: string;
  cents: number;
  currency: string;
  /** The amount in each other currency the price carries, by lowercase code. */
  options: Readonly<Record<string, number>>;
};

/** The shape every payment provider implements. */
export type PaymentGateway = {
  /** Checks the signature on the raw body and reads the event. Throws when it does not match. */
  readEvent: (body: string, signature: string) => PaymentEvent;
  /** Opens a checkout and answers with where to send the person and the provider's id for the session. */
  createCheckout: (request: CheckoutRequest) => Promise<{ url: string; sessionId: string }>;
  createPortal: (customerId: string, returnUrl: string) => Promise<string>;
  setCancelAtPeriodEnd: (subscriptionId: string, cancel: boolean) => Promise<void>;
  /** Ends a subscription now, with no credit for the unused time. A subscription already gone is fine. */
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  /** Refunds the customer's latest paid charge in full. The key makes a repeated request one refund. */
  refundLastPayment: (customerId: string, idempotencyKey: string) => Promise<void>;
  /**
   * Puts money on a customer's balance, which is taken off their next invoice. With no customer yet,
   * one is made from the e-mail. The key makes a repeated request one credit. Answers with the customer.
   */
  grantCredit: (request: CreditRequest) => Promise<{ customerId: string }>;
  /** The active prices that carry these lookup keys. A key with no price is simply absent. */
  readPrices: (lookupKeys: readonly string[]) => Promise<PriceTag[]>;
};
