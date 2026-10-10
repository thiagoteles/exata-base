import { describe, expect, it } from "vitest";
import { addressInLocale, servedAddress } from "./public-paths";

describe("the address of a page in a language", () => {
  it("is the Portuguese one in the default language, with no prefix", () => {
    expect(addressInLocale("/plans", "pt-BR")).toBe("/planos");
    expect(addressInLocale("/articles/um-guia", "pt-BR")).toBe("/artigos/um-guia");
    expect(addressInLocale("/", "pt-BR")).toBe("/");
  });

  it("is the route's own English address under the prefix in any other", () => {
    expect(addressInLocale("/plans", "en-US")).toBe("/en/plans");
    expect(addressInLocale("/articles/um-guia", "en-US")).toBe("/en/articles/um-guia");
    expect(addressInLocale("/", "en-US")).toBe("/en");
  });
});

describe("what a request address means", () => {
  it("moves the route address to the Portuguese one in the default language, and serves the Portuguese one", () => {
    expect(servedAddress("/plans", true)).toEqual({ route: "/plans", redirectTo: "/planos" });
    expect(servedAddress("/planos", true)).toEqual({ route: "/plans", redirectTo: null });
    expect(servedAddress("/account", true)).toEqual({ route: "/account", redirectTo: null });
  });

  it("serves the route address in another language and moves the Portuguese one to it", () => {
    expect(servedAddress("/plans", false)).toEqual({ route: "/plans", redirectTo: null });
    expect(servedAddress("/planos", false)).toEqual({ route: "/plans", redirectTo: "/plans" });
    expect(servedAddress("/artigos/um-guia", false)).toEqual({
      route: "/articles/um-guia",
      redirectTo: "/articles/um-guia",
    });
    expect(servedAddress("/account", false)).toEqual({ route: "/account", redirectTo: null });
  });
});
