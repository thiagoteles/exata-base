import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { corsHeaders, preflightHeaders } from "./cors";
import { allows, bearerOf, isApiScope, isUsable, visiblePart } from "./tokens";

const now = new Date("2026-10-09T12:00:00Z");

describe("the bearer header", () => {
  it("yields the token of a well-formed header", () => {
    expect(bearerOf("Bearer exb_abc-DEF_123")).toBe("exb_abc-DEF_123");
  });

  it("yields nothing for anything else", () => {
    for (const header of [
      null,
      "",
      "Bearer",
      "Bearer ",
      "Basic abc",
      "bearer abc",
      "Bearer a b",
      "Bearer a\nb",
    ]) {
      expect(bearerOf(header)).toBeNull();
    }
  });

  it("round-trips any token made of the characters a token uses", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z0-9_-]{1,80}$/), (token) => {
        expect(bearerOf(`Bearer ${token}`)).toBe(token);
      }),
    );
  });
});

describe("a token in force", () => {
  it("works until it is revoked or expires, and not a moment after", () => {
    expect(isUsable({ revokedAt: null, expiresAt: null }, now)).toBe(true);
    expect(isUsable({ revokedAt: null, expiresAt: new Date(now.getTime() + 1) }, now)).toBe(true);
    expect(isUsable({ revokedAt: null, expiresAt: now }, now)).toBe(false);
    expect(isUsable({ revokedAt: now, expiresAt: null }, now)).toBe(false);
  });
});

describe("scopes", () => {
  it("allow a call only when the token holds the scope", () => {
    expect(allows(["profile:read"], "profile:read")).toBe(true);
    expect(allows([], "profile:read")).toBe(false);
    expect(isApiScope("profile:read")).toBe(true);
    expect(isApiScope("admin:all")).toBe(false);
  });

  it("show only the start of a token in a list", () => {
    expect(visiblePart("exb_0123456789")).toBe("exb_0123");
  });
});

describe("the origins that may read the API", () => {
  const allowed = ["https://app.example.com"];

  it("name the origin back when it is on the list, and nothing when it is not", () => {
    expect(corsHeaders("https://app.example.com", allowed)).toEqual({
      Vary: "Origin",
      "Access-Control-Allow-Origin": "https://app.example.com",
    });
    expect(corsHeaders("https://evil.example", allowed)).toEqual({ Vary: "Origin" });
    expect(corsHeaders(null, allowed)).toEqual({ Vary: "Origin" });
  });

  it("never answer with a wildcard or with credentials", () => {
    const headers = preflightHeaders("https://app.example.com", allowed);
    expect(Object.values(headers)).not.toContain("*");
    expect(Object.keys(headers)).not.toContain("Access-Control-Allow-Credentials");
    expect(headers["Access-Control-Allow-Headers"]).toContain("Authorization");
  });

  it("allow the methods only to a listed origin", () => {
    expect(preflightHeaders("https://evil.example", allowed)).toEqual({ Vary: "Origin" });
  });
});
