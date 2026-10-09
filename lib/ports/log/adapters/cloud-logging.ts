import process from "node:process";
import { Writable } from "node:stream";
import { Logging } from "@google-cloud/logging";

/*
 * Ships each JSON log line to Cloud Logging. The server runs outside Google Cloud, with no agent
 * reading stdout, so the app writes the entries itself. Lines are already redacted upstream.
 */

/** `logName` picks the log an entry goes to; access lines go to their own, kept apart and longer. */
export type LogEntry = { severity: string; logName: string; payload: Record<string, unknown> };

/** Where entries go, so tests can stand in for Google. */
export type LogSink = { write: (entry: LogEntry) => Promise<void> };

type Credentials = { client_email: string; private_key: string };

export function googleLogSink(credentials: Credentials, projectId: string): LogSink {
  const logging = new Logging({
    projectId,
    credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
  });
  const logs = new Map<string, ReturnType<typeof logging.log>>();
  return {
    write: async ({ severity, logName, payload }) => {
      const log = logs.get(logName) ?? logging.log(logName);
      logs.set(logName, log);
      await log.write(log.entry({ severity, resource: { type: "global" } }, payload));
    },
  };
}

export function createCloudLoggingStream(sink: LogSink): Writable {
  return new Writable({
    write(chunk: Buffer, _encoding, done) {
      const lines = chunk
        .toString()
        .split("\n")
        .filter((line) => line.trim() !== "");
      for (const line of lines) {
        const {
          severity = "DEFAULT",
          logName = "app",
          ...payload
        } = JSON.parse(line) as Record<string, unknown>;
        sink
          .write({ severity: String(severity), logName: String(logName), payload })
          .catch((error: unknown) => {
            // The log cannot log its own failure; stderr still reaches the host.
            process.stderr.write(`cloud logging write failed: ${String(error)}\n`);
          });
      }
      done();
    },
  });
}
