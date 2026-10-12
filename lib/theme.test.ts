import { describe, expect, it } from "vitest";
import { pageAttributes, pageScript, themeCookie } from "./theme";

type Options = { cookie: string; systemContrast?: boolean };

function run({ cookie, systemContrast = false }: Options) {
  const attributes = new Map<string, string>();
  const document = {
    cookie,
    documentElement: {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      hasAttribute: (name: string) => attributes.has(name),
    },
  };
  const matchMedia = (query: string) => ({ matches: systemContrast && query.includes("more") });
  new Function("document", "matchMedia", pageScript)(document, matchMedia);
  return attributes;
}

describe("the look of the page before paint", () => {
  it("applies the theme from the cookie", () => {
    expect(run({ cookie: "a=1; theme=dark; b=2" }).get("data-theme")).toBe("dark");
    expect(run({ cookie: "theme=light" }).get("data-theme")).toBe("light");
  });

  it("applies every other choice from its own cookie, and only the values that set it", () => {
    const set = run({ cookie: "font-scale=larger; motion=reduce; contrast=more" });
    expect(Object.fromEntries(set)).toEqual({
      "data-font-scale": "larger",
      "data-motion": "reduce",
      "data-contrast": "more",
    });
    expect(run({ cookie: "font-scale=large" }).get("data-font-scale")).toBe("large");
    expect(run({ cookie: "font-scale=huge; motion=none; contrast=less" }).size).toBe(0);
  });

  it("leaves the system setting alone without a valid cookie", () => {
    expect(run({ cookie: "" }).size).toBe(0);
    expect(run({ cookie: "theme=blue" }).size).toBe(0);
    expect(run({ cookie: "mytheme=dark" }).size).toBe(0);
    expect(run({ cookie: "xfont-scale=large" }).size).toBe(0);
  });

  it("uses the stronger contrast when the system asks for it and the person chose nothing", () => {
    expect(run({ cookie: "", systemContrast: true }).get("data-contrast")).toBe("more");
    expect(run({ cookie: "theme=dark", systemContrast: true }).get("data-contrast")).toBe("more");
    expect(run({ cookie: "", systemContrast: false }).has("data-contrast")).toBe(false);
  });

  it("never throws, even when cookies are unreadable or the browser has no media queries", () => {
    const broken = {
      get cookie(): string {
        throw new Error("blocked");
      },
    };
    expect(() => new Function("document", pageScript)(broken)).not.toThrow();
    const bare = {
      cookie: "theme=dark",
      documentElement: { setAttribute: () => undefined, hasAttribute: () => false },
    };
    expect(() => new Function("document", pageScript)(bare)).not.toThrow();
  });

  it("writes a cookie the script can read back", () => {
    const value = themeCookie("dark").split(";")[0] ?? "";
    expect(run({ cookie: value }).get("data-theme")).toBe("dark");
  });

  it("gives every choice a cookie and an attribute of its own", () => {
    const cookies = pageAttributes.map(({ cookie }) => cookie);
    const attributes = pageAttributes.map(({ attribute }) => attribute);
    expect(new Set(cookies).size).toBe(cookies.length);
    expect(new Set(attributes).size).toBe(attributes.length);
  });
});
