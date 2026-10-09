import "server-only";
import { after } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/ports/log";
import { umamiSink } from "./adapters/umami";
import type { AnalyticsSink, ServerEvent } from "./types";

/*
 * The analytics port, for what only the server knows: a payment confirmed by a webhook, an account
 * created. The browser sends the rest itself. Without Umami configured, events go nowhere.
 */

function configuredSink(): AnalyticsSink {
  if (env.UMAMI_WEBSITE_ID === undefined || env.UMAMI_SCRIPT_URL === undefined) {
    return () => Promise.resolve();
  }
  return umamiSink({
    origin: new URL(env.UMAMI_SCRIPT_URL).origin,
    websiteId: env.UMAMI_WEBSITE_ID,
    appUrl: env.APP_URL,
    onFailure: (reason) => logger.warn("analytics event not sent", { reason }),
  });
}

const sink = configuredSink();

/** Sends the event once the response is out, so the person never waits on the analytics service. */
export function sendEvent(event: ServerEvent): void {
  after(() => sink(event));
}
