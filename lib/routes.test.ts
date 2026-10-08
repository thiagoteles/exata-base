import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isProtectedPath, safeReturnPath, signInRedirect } from "./routes";

describe("the way back after sign-in", () => {
  it("keeps a path on this site", () => {
    expect(safeReturnPath("/account/plan?tab=card#top")).toBe("/account/plan?tab=card#top");
  });

  it("drops anything that could leave the site", () => {
    for (const value of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "javascript:alert(1)",
      " /x",
      "",
      null,
    ]) {
      expect(safeReturnPath(value)).toBe("/");
    }
  });

  it("never returns another origin, whatever it is given", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const result = safeReturnPath(value);
        return (
          result.startsWith("/") &&
          !result.startsWith("//") &&
          new URL(result, "https://app.test").origin === "https://app.test"
        );
      }),
    );
  });

  it("round-trips through the sign-in link", () => {
    const link = new URL(signInRedirect("/account", "?a=1"), "https://app.test");
    expect(safeReturnPath(link.searchParams.get("next"))).toBe("/account?a=1");
  });
});

describe("protected paths", () => {
  it("cover the areas behind sign-in and nothing that only shares a prefix", () => {
    expect(["/account", "/admin/users", "/staff", "/catalog"].every(isProtectedPath)).toBe(true);
    expect(["/", "/plans", "/accounts", "/administration"].some(isProtectedPath)).toBe(false);
  });
});
