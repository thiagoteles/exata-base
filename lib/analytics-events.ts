/*
 * Every analytics event the product sends, with the properties each one carries. Sending an event
 * not listed here, or a property it does not declare, fails the typecheck. A property may never be
 * named after personal data: the catalog refuses it, so nothing that identifies a person beyond the
 * internal account id reaches the analytics service.
 *
 * The standard funnel: page_view (Umami counts it), signup_completed, activated (the product decides
 * what activation is and sends it), paywall_viewed, checkout_started, payment_confirmed.
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
  checkout_started: { interval: string };
  payment_confirmed: { method: string; cents: number };
}>;

export type AnalyticsEvent = keyof AnalyticsEvents;

/** The data argument, optional when the event carries none. */
export type EventData<E extends AnalyticsEvent> =
  Record<string, never> extends AnalyticsEvents[E]
    ? [data?: AnalyticsEvents[E]]
    : [data: AnalyticsEvents[E]];
