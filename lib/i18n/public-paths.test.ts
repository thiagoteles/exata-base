import { describe, expect, it } from "vitest";

// A dynamic address no product gives another place: a product may move any page, the article ones too.
import { addressInLocale, servedAddress } from "./public-paths";

describe("the address of a page in a language", () => {
  it("is the Portuguese one in the default language, with no prefix", () => {
    expect(addressInLocale("/plans", "pt-BR")).toBe("/planos");
    expect(addressInLocale("/verify/um-codigo", "pt-BR")).toBe("/verificar/um-codigo");
    expect(addressInLocale("/", "pt-BR")).toBe("/");
  });

  it("is the route's own English address under the prefix in any other", () => {
    expect(addressInLocale("/plans", "en-US")).toBe("/en/plans");
    expect(addressInLocale("/verify/um-codigo", "en-US")).toBe("/en/verify/um-codigo");
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
    expect(servedAddress("/verificar/um-codigo", false)).toEqual({
      route: "/verify/um-codigo",
      redirectTo: "/verify/um-codigo",
    });
    expect(servedAddress("/account", false)).toEqual({ route: "/account", redirectTo: null });
  });
});
