import { describe, expect, it } from "vitest";
import { buildCsp, clerkFrontendHost } from "./csp";

const directive = (policy: string, name: string) =>
  policy.split("; ").find((part) => part.startsWith(`${name} `));

describe("content security policy", () => {
  it("closes every origin the app does not declare, and frames entirely", () => {
    const policy = buildCsp([], { development: false });
    expect(directive(policy, "script-src")).toBe("script-src 'self' 'unsafe-inline'");
    expect(directive(policy, "frame-src")).toBe("frame-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("report-uri /api/csp-report");
    expect(policy).not.toContain("report-to");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("opens exactly what each part declares, replacing a 'none'", () => {
    const policy = buildCsp(
      [
        {
          "script-src": ["https://umami.example.com"],
          "connect-src": ["https://umami.example.com"],
        },
        { "frame-src": ["https://challenges.cloudflare.com"] },
      ],
      { development: false },
    );
    expect(directive(policy, "script-src")).toBe(
      "script-src 'self' 'unsafe-inline' https://umami.example.com",
    );
    expect(directive(policy, "frame-src")).toBe("frame-src https://challenges.cloudflare.com");
  });

  it("lets the development server evaluate code and open its socket", () => {
    const policy = buildCsp([], { development: true });
    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "connect-src")).toContain("ws:");
  });

  it("reads the Clerk host out of a publishable key, and refuses a malformed one", () => {
    const key = `pk_test_${Buffer.from("clerk.exemplo.com.br$").toString("base64")}`;
    expect(clerkFrontendHost(key)).toBe("clerk.exemplo.com.br");
    expect(clerkFrontendHost("pk_test")).toBeNull();
    expect(clerkFrontendHost(`pk_test_${Buffer.from("<script>").toString("base64")}`)).toBeNull();
  });
});
