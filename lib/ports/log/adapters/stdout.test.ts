import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createStdoutLogger } from "./stdout";

function capture() {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  return { lines, logger: createStdoutLogger({ level: "debug", destination }) };
}

describe("stdout log", () => {
  it("writes the Cloud Logging severity and message", () => {
    const { lines, logger } = capture();
    logger.child({ requestId: "req-1" }).error("payment failed", { orderId: 7 });
    expect(lines[0]).toMatchObject({
      severity: "ERROR",
      message: "payment failed",
      requestId: "req-1",
      orderId: 7,
    });
  });

  it("uses Cloud Logging's names for warnings", () => {
    const { lines, logger } = capture();
    logger.warn("slow");
    expect(lines[0]).toMatchObject({ severity: "WARNING" });
  });

  it("never writes a password, token, cookie or raw webhook body", () => {
    const { lines, logger } = capture();
    logger.info("login", {
      password: "hunter2",
      user: { token: "abc", profile: { cookie: "session=1" } },
      rawBody: "{}",
    });
    const written = JSON.stringify(lines[0]);
    for (const secret of ["hunter2", "abc", "session=1", '{}"']) {
      expect(written).not.toContain(secret);
    }
  });

  it("writes errors in the Error Reporting shape, with the stack or a location", () => {
    const lines: Record<string, unknown>[] = [];
    const logger = createStdoutLogger({
      level: "debug",
      service: { service: "loja", version: "abc123" },
      destination: new Writable({
        write(chunk: Buffer, _encoding, done) {
          lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
          done();
        },
      }),
    });
    logger.error("route failed", { error: new Error("boom"), requestId: "req-1" });
    logger.error("browser error", { path: "/conta" });
    logger.warn("slow");
    expect(lines[0]).toMatchObject({
      "@type": "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent",
      serviceContext: { service: "loja", version: "abc123" },
      requestId: "req-1",
    });
    expect(String(lines[0]?.["stack_trace"])).toMatch(/^Error: boom\n\s+at /);
    expect(lines[1]).toMatchObject({
      context: { reportLocation: { functionName: "browser error" } },
    });
    expect(lines[2]).not.toHaveProperty("@type");
  });
});
