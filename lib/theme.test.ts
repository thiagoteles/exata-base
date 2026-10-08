import { describe, expect, it } from "vitest";
import { themeCookie, themeScript } from "./theme";

function run(cookie: string) {
  const attributes = new Map<string, string>();
  const document = {
    cookie,
    documentElement: { setAttribute: (name: string, value: string) => attributes.set(name, value) },
  };
  new Function("document", themeScript)(document);
  return attributes.get("data-theme");
}

describe("theme before paint", () => {
  it("applies the theme from the cookie", () => {
    expect(run("a=1; theme=dark; b=2")).toBe("dark");
    expect(run("theme=light")).toBe("light");
  });

  it("leaves the system setting alone without a valid cookie", () => {
    expect(run("")).toBeUndefined();
    expect(run("theme=blue")).toBeUndefined();
    expect(run("mytheme=dark")).toBeUndefined();
  });

  it("never throws, even when cookies are unreadable", () => {
    const broken = {
      get cookie(): string {
        throw new Error("blocked");
      },
    };
    expect(() => new Function("document", themeScript)(broken)).not.toThrow();
  });

  it("writes a cookie the script can read back", () => {
    const value = themeCookie("dark").split(";")[0] ?? "";
    expect(run(value)).toBe("dark");
  });
});
