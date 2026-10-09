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

/** Which deployed service wrote the line, so Error Reporting can group errors per version. */
type ServiceContext = { service: string; version: string };

type Options = {
  level: pino.Level | "silent";
  destination?: pino.DestinationStream | undefined;
  service?: ServiceContext;
};

const REPORTED_ERROR =
  "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent";

/*
 * What Cloud Error Reporting needs to group an error: the event type, the service and its version,
 * and either the stack (grouped by its frames) or, when there is none, a location (grouped by the
 * message). With these, the GCP console counts each group, shows its first and last time, and alerts
 * only on a new group or one that comes back.
 */
function errorReporting(message: string, fields: LogFields, service: ServiceContext): LogFields {
  const error = Object.values(fields).find((value): value is Error => value instanceof Error);
  return {
    ...fields,
    "@type": REPORTED_ERROR,
    serviceContext: service,
    ...(error?.stack === undefined
      ? { context: { reportLocation: { functionName: message } } }
      : { stack_trace: error.stack }),
  };
}

// The severities Cloud Logging understands; pino's own labels differ for warn and fatal.
const severities: Readonly<Record<string, string>> = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

function wrap(instance: pino.Logger, service: ServiceContext): Logger {
  return {
    debug: (message, fields) => instance.debug(fields ?? {}, message),
    info: (message, fields) => instance.info(fields ?? {}, message),
    warn: (message, fields) => instance.warn(fields ?? {}, message),
    error: (message, fields) =>
      instance.error(errorReporting(message, fields ?? {}, service), message),
    child: (bindings: LogFields) => wrap(instance.child(bindings), service),
  };
}

export function createStdoutLogger({
  level,
  destination,
  service = { service: "app", version: "unknown" },
}: Options): Logger {
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
  return wrap(instance, service);
}
