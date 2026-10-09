import { describe, expect, it } from "vitest";
import { readViolations } from "./csp-report";

describe("CSP reports", () => {
  it("reads the older csp-report shape, keeping origins and paths only", () => {
    expect(
      readViolations({
        "csp-report": {
          "document-uri": "https://exemplo.com.br/conta?email=ana@x.com",
          "violated-directive": "script-src-elem",
          "blocked-uri": "https://evil.example/x.js?token=1",
        },
      }),
    ).toEqual([{ directive: "script-src-elem", blocked: "https://evil.example", page: "/conta" }]);
  });

  it("reads the Reporting API list and skips other report types", () => {
    expect(
      readViolations([
        { type: "deprecation", body: {} },
        {
          type: "csp-violation",
          body: {
            documentURL: "https://exemplo.com.br/",
            effectiveDirective: "script-src",
            blockedURL: "inline",
          },
        },
      ]),
    ).toEqual([{ directive: "script-src", blocked: "inline", page: "/" }]);
  });

  it("returns nothing for a body that is not a report", () => {
    expect(readViolations({ hello: 1 })).toEqual([]);
    expect(readViolations(null)).toEqual([]);
    expect(readViolations("x")).toEqual([]);
  });
});
