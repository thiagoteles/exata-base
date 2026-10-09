import { describe, expect, it } from "vitest";
import { afterSignIn } from "./sign-in-complete";

describe("after signing in", () => {
  it("goes where the person was headed, and carries their saved theme to the browser", () => {
    expect(afterSignIn({ theme: "dark" }, {}, "/account?tab=plan")).toMatchObject({
      location: "/account?tab=plan",
      cookies: [{ name: "theme", value: "dark" }],
      save: [],
    });
  });

  it("carries the saved language, and drops one that is not on the list", () => {
    expect(afterSignIn({ locale: "pt-BR" }, {}, null).cookies).toEqual([
      { name: "NEXT_LOCALE", value: "pt-BR" },
    ]);
    expect(afterSignIn({ locale: "xx-XX" }, {}, null).cookies).toEqual([]);
  });

  it("clears the theme cookie for a person who chose the system's own", () => {
    expect(afterSignIn({ theme: "system" }, { theme: "dark" }, null).cookies).toEqual([
      { name: "theme", value: null },
    ]);
  });

  it("saves to the account what this browser held and the account did not", () => {
    expect(afterSignIn({}, { theme: "dark", NEXT_LOCALE: "pt-BR" }, null)).toMatchObject({
      cookies: [],
      save: [
        { key: "theme", value: "dark" },
        { key: "locale", value: "pt-BR" },
      ],
    });
  });

  it("lets what the account saved win over what the browser held", () => {
    const result = afterSignIn({ theme: "light" }, { theme: "dark" }, null);
    expect(result.cookies).toEqual([{ name: "theme", value: "light" }]);
    expect(result.save).toEqual([]);
  });

  it("ignores a cookie that is not a valid value, and one named like a prototype property", () => {
    expect(afterSignIn({}, { theme: "sepia", NEXT_LOCALE: "xx-XX" }, null).save).toEqual([]);
    expect(afterSignIn({}, { toString: "x", constructor: "y" }, null).save).toEqual([]);
  });

  it("ignores a way back that leaves the site", () => {
    for (const next of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "javascript:alert(1)",
    ]) {
      expect(afterSignIn({}, {}, next).location).toBe("/");
    }
  });

  it("does not invent a cookie, and drops a theme it does not know or an option nobody declared", () => {
    expect(afterSignIn({}, {}, null)).toMatchObject({ cookies: [], save: [] });
    expect(afterSignIn({ theme: "sepia", removedOption: "x" }, {}, null).cookies).toEqual([]);
  });
});
