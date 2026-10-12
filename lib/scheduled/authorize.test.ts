import { describe, expect, it } from "vitest";
import { isAuthorizedCall } from "./authorize";

const secret = "s".repeat(32);

describe("a scheduled call", () => {
  it("is refused when no secret is configured, even with a header", () => {
    expect(isAuthorizedCall(undefined, "Bearer anything")).toBe(false);
    expect(isAuthorizedCall(undefined, null)).toBe(false);
  });

  it("is refused without the header, with the wrong secret, or without the Bearer word", () => {
    expect(isAuthorizedCall(secret, null)).toBe(false);
    expect(isAuthorizedCall(secret, "Bearer wrong")).toBe(false);
    expect(isAuthorizedCall(secret, secret)).toBe(false);
  });

  it("is accepted with the secret as a bearer token", () => {
    expect(isAuthorizedCall(secret, `Bearer ${secret}`)).toBe(true);
  });
});
