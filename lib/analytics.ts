/*
 * Umami, with no SDK. The script is in the root layout only when UMAMI_WEBSITE_ID is set; without
 * it these functions do nothing. Only the account's internal id is ever sent: never an e-mail, a
 * name or anything a person typed.
 */

import type { AnalyticsEvent, AnalyticsEvents, EventData } from "./analytics-events";

type Umami = {
  track: (event: string, data?: AnalyticsEvents[AnalyticsEvent]) => void;
  identify: (id: string) => void;
};

function umami(): Umami | undefined {
  return (globalThis as { window?: { umami?: Umami } }).window?.umami;
}

/** Sends one event of the catalog from the browser. */
export function track<E extends AnalyticsEvent>(event: E, ...[data]: EventData<E>): void {
  umami()?.track(event, data);
}

export function identify(accountId: string): void {
  umami()?.identify(accountId);
}
