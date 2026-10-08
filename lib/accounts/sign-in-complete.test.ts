import { describe, expect, it } from "vitest";
import { afterSignIn } from "./sign-in-complete";

describe("after signing in", () => {
  it("goes where the person was headed, and carries their saved theme", () => {
    expect(afterSignIn({ theme: "dark" }, "/account?tab=plan")).toEqual({
      location: "/account?tab=plan",
      theme: "dark",
      locale: null,
    });
  });

  it("carries the saved language, and drops one that is not on the list", () => {
    expect(afterSignIn({ locale: "pt-BR" }, null).locale).toBe("pt-BR");
    expect(afterSignIn({ locale: "xx-XX" }, null).locale).toBeNull();
  });

  it("ignores a way back that leaves the site", () => {
    for (const next of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "javascript:alert(1)",
    ]) {
      expect(afterSignIn({}, next).location).toBe("/");
    }
  });

  it("does not invent a theme, and drops one it does not know", () => {
    expect(afterSignIn({}, null).theme).toBeNull();
    expect(afterSignIn({ theme: "sepia" as never }, null).theme).toBeNull();
  });
});
