/*
 * Every analytics event the product sends, with the properties each one carries. Sending an event
 * not listed here, or a property it does not declare, fails the typecheck. A property may never be
 * named after personal data: the catalog refuses it, so nothing that identifies a person beyond the
 * internal account id reaches the analytics service.
 *
 * The standard funnel: page_view (Umami counts it), signup_completed, activated (the product decides
 * what activation is and sends it), paywall_viewed, checkout_started, payment_confirmed. Beside it,
 * web_vital measures how the pages feel.
 */

type Value = string | number | boolean;
type PersonalKey = "email" | "name" | "cpf" | "cnpj" | "phone" | "address" | "password";
type EventShape = Readonly<Record<string, Value>> & { readonly [K in PersonalKey]?: never };

/** Holds the catalog to its rules; a property named after personal data does not fit. */
export type EventCatalog<T extends Record<string, EventShape>> = T;

export type AnalyticsEvents = EventCatalog<{
  signup_completed: Record<string, never>;
  activated: Record<string, never>;
  paywall_viewed: { source: string };
  /** The person chose to buy and a checkout opened. `source` is the screen that showed the offer. */
  checkout_started: { interval: string; source: string };
  /** The checkout was paid (or its trial began), with the same `source` it started from. */
  checkout_completed: { interval: string; source: string };
  /** A free trial began: the plan is on and the first charge is days away. */
  trial_started: { interval: string };
  /** Money went back to a customer, in cents of the currency it was paid in. */
  refund_issued: { cents: number; currency: string };
  /** `revenue` (in units, not cents) and `currency` are the names Umami's revenue report reads. */
  payment_confirmed: { method: string; cents: number; revenue: number; currency: string };
  /** LCP, INP or CLS from a sample of page loads. Milliseconds, except CLS, which has no unit. */
  web_vital: { metric: string; value: number; rating: string };
}>;

export type AnalyticsEvent = keyof AnalyticsEvents;

/** The standard funnel in order, which the analytics setup builds its reports from. */
export const funnel = [
  "signup_completed",
  "activated",
  "paywall_viewed",
  "checkout_started",
  "checkout_completed",
  "payment_confirmed",
] as const satisfies readonly AnalyticsEvent[];

/** The data argument, optional when the event carries none. */
export type EventData<E extends AnalyticsEvent> =
  Record<string, never> extends AnalyticsEvents[E]
    ? [data?: AnalyticsEvents[E]]
    : [data: AnalyticsEvents[E]];
