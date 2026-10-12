import pino from "pino";
import { env } from "@/lib/env";
import { createCloudLoggingStream, googleLogSink } from "./adapters/cloud-logging";
import { createStdoutLogger } from "./adapters/stdout";
import type { Logger } from "./types";

/*
 * The log port. Code logs through this interface only. Lines always go to stdout; with the GCP
 * variables set they also go to Cloud Logging, where the ERROR alert reads them.
 */

const levels = { production: "info", development: "debug", test: "silent" } as const;

function destination(): pino.DestinationStream | undefined {
  if (env.GCP_CREDENTIALS === undefined || env.GCP_PROJECT === undefined) {
    return undefined;
  }
  const cloud = createCloudLoggingStream(googleLogSink(env.GCP_CREDENTIALS, env.GCP_PROJECT));
  return pino.multistream([{ stream: pino.destination({ sync: false }) }, { stream: cloud }]);
}

export const logger: Logger = createStdoutLogger({
  level: levels[env.NODE_ENV],
  destination: destination(),
  service: { service: env.SERVICE_NAME, version: env.SOURCE_COMMIT?.slice(0, 12) ?? "unknown" },
});
