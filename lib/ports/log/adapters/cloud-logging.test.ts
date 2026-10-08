import { describe, expect, it } from "vitest";
import { createCloudLoggingStream, type LogEntry } from "./cloud-logging";
import { createStdoutLogger } from "./stdout";

describe("Cloud Logging destination", () => {
  it("ships each line with its severity, after redaction", async () => {
    const entries: LogEntry[] = [];
    const stream = createCloudLoggingStream({
      write: (entry) => {
        entries.push(entry);
        return Promise.resolve();
      },
    });
    const logger = createStdoutLogger({ level: "info", destination: stream });
    logger.child({ requestId: "req-1" }).error("payment failed", { token: "secret" });
    logger.warn("slow");
    await new Promise((resolve) => setImmediate(resolve));

    expect(entries.map(({ severity }) => severity)).toEqual(["ERROR", "WARNING"]);
    expect(entries[0]?.payload).toMatchObject({
      message: "payment failed",
      requestId: "req-1",
      token: "[redacted]",
    });
  });
});
