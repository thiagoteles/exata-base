import type { AnalyticsSink } from "../types";

type UmamiOptions = {
  /** The Umami server, the origin of its script. */
  origin: string;
  websiteId: string;
  /** The product's own address: Umami files the event under its host name. */
  appUrl: string;
  onFailure: (reason: string) => void;
  fetch?: typeof globalThis.fetch;
};

const DEADLINE_MS = 2000;
// Umami discards requests whose user agent reads as a robot, and a server has none of its own.
const userAgent = "Mozilla/5.0 (compatible; ServerEvents/1.0)";

/*
 * Umami's collection endpoint, with no SDK. The payload's id is the distinct id the browser sets
 * with identify, so a server event joins the same person's session in the funnel.
 */
export function umamiSink(options: UmamiOptions): AnalyticsSink {
  const send = options.fetch ?? globalThis.fetch;
  const hostname = new URL(options.appUrl).hostname;
  return async (event) => {
    try {
      const response = await send(new URL("/api/send", options.origin), {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": userAgent },
        body: JSON.stringify({
          type: "event",
          payload: {
            website: options.websiteId,
            hostname,
            url: "/",
            name: event.name,
            data: event.data,
            id: event.accountId,
          },
        }),
        signal: AbortSignal.timeout(DEADLINE_MS),
      });
      if (!response.ok) {
        options.onFailure(`Umami answered ${response.status}`);
      }
    } catch (error) {
      options.onFailure(error instanceof Error ? error.message : String(error));
    }
  };
}
