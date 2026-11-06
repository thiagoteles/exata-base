import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { afterSignUp, isProtectedPath, safeReturnPath, signInRedirect } from "./routes";

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

describe("where a new account lands", () => {
  it("goes where the person was headed", () => {
    expect(afterSignUp("/saved-games?x=1", "/panel")).toBe("/saved-games?x=1");
  });

  it("lands on the product's first screen when there was nowhere in particular to go", () => {
    expect(afterSignUp(null, "/panel")).toBe("/panel");
    expect(afterSignUp("/", "/panel")).toBe("/panel");
    expect(afterSignUp("https://evil.test/x", "/panel")).toBe("/panel");
  });

  it("lands on the account page when the product has no first screen of its own", () => {
    expect(afterSignUp(undefined, "/")).toBe("/account");
  });
});
