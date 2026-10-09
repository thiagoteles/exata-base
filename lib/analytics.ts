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

const WAIT = { attempts: 40, everyMs: 250 };

/**
 * Ties this page load's events to the account. Umami keeps the id only until the page unloads, so
 * a signed-in page calls this on every load. The script loads after the page is interactive, so
 * the call waits for it (ten seconds at most) and returns a function that stops waiting.
 */
export function identify(accountId: string, wait = WAIT): () => void {
  let left = wait.attempts;
  const attempt = (): boolean => {
    const tracker = umami();
    tracker?.identify(accountId);
    left -= 1;
    return tracker !== undefined || left <= 0;
  };
  if (attempt()) {
    return () => undefined;
  }
  const timer = setInterval(() => {
    if (attempt()) {
      clearInterval(timer);
    }
  }, wait.everyMs);
  return () => clearInterval(timer);
}
