import { describe, expect, it } from "vitest";
import { clientAddress } from "./client-address";

const headers = (values: Record<string, string>) => new Headers(values);

describe("client address", () => {
  it("trusts the value Traefik appended, not the one the caller wrote", () => {
    const forged = headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" });
    expect(clientAddress(forged, "traefik")).toBe("203.0.113.9");
  });

  it("reads CF-Connecting-IP behind Cloudflare and ignores X-Forwarded-For", () => {
    const behind = headers({ "cf-connecting-ip": "198.51.100.4", "x-forwarded-for": "6.6.6.6" });
    expect(clientAddress(behind, "cloudflare")).toBe("198.51.100.4");
  });

  it("answers null when the trusted header is missing or empty", () => {
    expect(clientAddress(headers({}), "traefik")).toBeNull();
    expect(clientAddress(headers({ "x-forwarded-for": " " }), "traefik")).toBeNull();
    expect(clientAddress(headers({ "x-forwarded-for": "6.6.6.6" }), "cloudflare")).toBeNull();
  });
});
