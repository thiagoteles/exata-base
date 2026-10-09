import { describe, expect, it } from "vitest";
import { afterSignIn } from "./sign-in-complete";

describe("after signing in", () => {
  it("goes where the person was headed, and carries their saved theme", () => {
    expect(afterSignIn({ theme: "dark" }, "/account?tab=plan")).toEqual({
      location: "/account?tab=plan",
      cookies: [{ name: "theme", value: "dark" }],
    });
  });

  it("carries the saved language, and drops one that is not on the list", () => {
    expect(afterSignIn({ locale: "pt-BR" }, null).cookies).toEqual([
      { name: "NEXT_LOCALE", value: "pt-BR" },
    ]);
    expect(afterSignIn({ locale: "xx-XX" }, null).cookies).toEqual([]);
  });

  it("clears the theme cookie for a person who chose the system's own", () => {
    expect(afterSignIn({ theme: "system" }, null).cookies).toEqual([
      { name: "theme", value: null },
    ]);
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

  it("does not invent a cookie, and drops a theme it does not know or an option nobody declared", () => {
    expect(afterSignIn({}, null).cookies).toEqual([]);
    expect(afterSignIn({ theme: "sepia", removedOption: "x" }, null).cookies).toEqual([]);
  });
});
