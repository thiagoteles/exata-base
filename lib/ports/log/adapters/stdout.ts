import pino from "pino";
import type { LogFields, Logger } from "../types";

/*
 * JSON lines on stdout. `severity` and `message` follow the Cloud Logging structured format, so
 * the same lines are understood when shipped to Cloud Logging, and log-based alerts on ERROR work.
 */

const sensitiveKeys = [
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "rawBody",
];

// pino has no recursive wildcard, so each key is redacted at the top level and two levels deep.
const redactedPaths = sensitiveKeys.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]);

type Options = { level: pino.Level | "silent"; destination?: pino.DestinationStream | undefined };

// The severities Cloud Logging understands; pino's own labels differ for warn and fatal.
const severities: Readonly<Record<string, string>> = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

function wrap(instance: pino.Logger): Logger {
  return {
    debug: (message, fields) => instance.debug(fields ?? {}, message),
    info: (message, fields) => instance.info(fields ?? {}, message),
    warn: (message, fields) => instance.warn(fields ?? {}, message),
    error: (message, fields) => instance.error(fields ?? {}, message),
    child: (bindings: LogFields) => wrap(instance.child(bindings)),
  };
}

export function createStdoutLogger({ level, destination }: Options): Logger {
  const instance = pino(
    {
      level,
      base: null,
      messageKey: "message",
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ severity: severities[label] ?? "DEFAULT" }) },
      serializers: { error: pino.stdSerializers.err },
      redact: { paths: redactedPaths, censor: "[redacted]" },
    },
    destination ?? pino.destination({ sync: false }),
  );
  return wrap(instance);
}
