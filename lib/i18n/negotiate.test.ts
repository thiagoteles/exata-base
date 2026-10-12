/*
 * The product ships one language, so these tests would have nothing to choose between. They run
 * the same functions against a catalog list with English added, through the module mock below.
 */
import { describe, expect, it, vi } from "vitest";
import { fromAcceptLanguage, negotiate, pathInLocale, stripLocalePrefix } from "./negotiate";

vi.mock("./locales", async (importOriginal) => {
  const original = await importOriginal<typeof import("./locales")>();
  const locales = ["pt-BR", "en-US"] as const;
  return {
    ...original,
    locales,
    isLocale: (value: string | null | undefined) => locales.some((locale) => locale === value),
  };
});

const base = { cookie: undefined, acceptLanguage: null, canRedirect: true };

describe("the language of a request", () => {
  it("takes the prefix first, and hands back the clean address", () => {
    expect(negotiate({ ...base, pathname: "/en/plans", cookie: "pt-BR" })).toEqual({
      locale: "en-US",
      pathname: "/plans",
      redirectTo: null,
    });
    expect(negotiate({ ...base, pathname: "/en" })).toMatchObject({ pathname: "/" });
  });

  it("serves the default language at the clean address when nothing says otherwise", () => {
    expect(negotiate({ ...base, pathname: "/plans" })).toEqual({
      locale: "pt-BR",
      pathname: "/plans",
      redirectTo: null,
    });
  });

  it("sends a saved choice or the browser's language to its prefix, once, on a page load", () => {
    expect(negotiate({ ...base, pathname: "/plans", cookie: "en-US" }).redirectTo).toBe(
      "/en/plans",
    );
    expect(negotiate({ ...base, pathname: "/", acceptLanguage: "en-GB,en;q=0.8" }).redirectTo).toBe(
      "/en",
    );
    expect(
      negotiate({ ...base, pathname: "/plans", cookie: "en-US", canRedirect: false }),
    ).toMatchObject({ locale: "en-US", redirectTo: null });
  });

  it("lets the cookie beat the browser, and ignores a cookie that is not a language", () => {
    expect(
      negotiate({ ...base, pathname: "/x", cookie: "pt-BR", acceptLanguage: "en-US" }).redirectTo,
    ).toBeNull();
    expect(negotiate({ ...base, pathname: "/x", cookie: "xx" }).locale).toBe("pt-BR");
  });
});

describe("Accept-Language", () => {
  it("picks the best weighted match by language, and null when nothing matches", () => {
    expect(fromAcceptLanguage("fr;q=0.9, en-GB;q=0.8, pt;q=0.3")).toBe("en-US");
    expect(fromAcceptLanguage("pt-BR")).toBe("pt-BR");
    expect(fromAcceptLanguage("fr, de")).toBeNull();
    expect(fromAcceptLanguage(null)).toBeNull();
  });
});

describe("moving an address between languages", () => {
  it("adds the prefix for English only and strips it back", () => {
    const english = "en-US" as never;
    expect(pathInLocale("/plans", english)).toBe("/en/plans");
    expect(pathInLocale("/", english)).toBe("/en");
    expect(pathInLocale("/plans", "pt-BR")).toBe("/plans");
    expect(stripLocalePrefix("/en/account/plan")).toBe("/account/plan");
    expect(stripLocalePrefix("/english")).toBe("/english");
  });
});
