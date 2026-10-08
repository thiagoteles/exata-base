import { describe, expect, it } from "vitest";
import {
  browserKey,
  type ClientErrorReport,
  clientErrorSchema,
  createDeduper,
  fingerprint,
} from "./client-errors";

const report: ClientErrorReport = { source: "page", message: "boom", path: "/account" };

describe("the browser error report", () => {
  it("accepts the fixed fields and nothing else", () => {
    expect(clientErrorSchema.safeParse(report).success).toBe(true);
    expect(clientErrorSchema.safeParse({ ...report, extra: "x" }).success).toBe(false);
    expect(clientErrorSchema.safeParse({ ...report, source: "other" }).success).toBe(false);
  });

  it("refuses a path that is not on this site and fields that are too long", () => {
    expect(clientErrorSchema.safeParse({ ...report, path: "https://evil.example" }).success).toBe(
      false,
    );
    expect(clientErrorSchema.safeParse({ ...report, message: "x".repeat(501) }).success).toBe(
      false,
    );
    expect(clientErrorSchema.safeParse({ ...report, stack: "x".repeat(4001) }).success).toBe(false);
  });
});

describe("telling one error from another", () => {
  it("gives the same fingerprint to the same error from the same browser", () => {
    const browser = browserKey("1.2.3.4", "agent");
    expect(fingerprint(browser, report)).toBe(fingerprint(browser, { ...report }));
    expect(fingerprint(browser, report)).not.toBe(
      fingerprint(browser, { ...report, path: "/other" }),
    );
    expect(fingerprint(browser, report)).not.toBe(
      fingerprint(browserKey("5.6.7.8", "agent"), report),
    );
  });

  it("prefers the digest the server wrote to the log over the message", () => {
    const browser = browserKey("1.2.3.4", "agent");
    const a = fingerprint(browser, { ...report, digest: "d1", message: "one" });
    expect(a).toBe(fingerprint(browser, { ...report, digest: "d1", message: "two" }));
  });
});

describe("writing an error once a minute", () => {
  it("lets the first through, holds the repeat for the window and lets it through after", () => {
    const deduper = createDeduper(60_000);
    expect(deduper.firstTime("a", 0)).toBe(true);
    expect(deduper.firstTime("a", 59_999)).toBe(false);
    expect(deduper.firstTime("b", 30_000)).toBe(true);
    expect(deduper.firstTime("a", 60_000)).toBe(true);
  });
});
