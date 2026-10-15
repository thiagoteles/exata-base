import { describe, expect, it } from "vitest";
import { areaOf, joinAreas, overlay, overlayOf } from "./join";

describe("joining the areas of the catalog", () => {
  it("names an area after its file, and refuses a file that is not named like one", () => {
    expect(areaOf("nav.json")).toBe("nav");
    expect(areaOf("errorPage.json")).toBe("errorPage");
    for (const bad of ["nav.txt", "nav.json.bak", "my-area.json", ".json", "1nav.json", "nav"]) {
      expect(areaOf(bad)).toBeNull();
    }
  });

  it("knows a product's overlay of an area by its name, and lays it over the area key by key", () => {
    expect(overlayOf("nav.product.json")).toBe("nav");
    expect(overlayOf("nav.json")).toBeNull();
    expect(areaOf("nav.product.json")).toBeNull();
    const base = { items: { account: "Conta", plan: "Plano" }, title: "Menu" };
    const product = { items: { invoices: "Faturas", plan: "Assinatura" } };
    expect(overlay(base, product)).toEqual({
      items: { account: "Conta", plan: "Assinatura", invoices: "Faturas" },
      title: "Menu",
    });
  });

  it("puts the areas in alphabetical order whatever order they arrive in", () => {
    const text = joinAreas({ nav: { a: "x" }, account: { b: "y" } });
    expect(Object.keys(JSON.parse(text))).toEqual(["account", "nav"]);
    expect(joinAreas({ account: { b: "y" }, nav: { a: "x" } })).toBe(text);
  });

  it("writes two-space JSON with a closing newline, keeping text and nesting exactly", () => {
    const areas = { a: { deep: { key: "Olá, {name}" } } };
    const text = joinAreas(areas);
    expect(text.endsWith("}\n")).toBe(true);
    expect(text).toContain('\n  "a": {\n    "deep"');
    expect(JSON.parse(text)).toEqual(areas);
  });
});
