import type { AnalyticsEvent, AnalyticsEvents } from "@/lib/analytics-events";

/** One event of the catalog, sent by the server for the account that caused it. */
export type ServerEvent = {
  [E in AnalyticsEvent]: { name: E; accountId: string; data: AnalyticsEvents[E] };
}[AnalyticsEvent];

/** Where server events go. It never throws: analytics is not worth failing a request for. */
export type AnalyticsSink = (event: ServerEvent) => Promise<void>;
