import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { withFallback } from "./fallback";

type Catalog = { [key: string]: string | Catalog };
const byText = (a: string, b: string) => Number(a > b) - Number(a < b);
const base = { nav: { home: "Início", plans: "Planos" }, title: "Olá" };

const catalog: fc.Arbitrary<Catalog> = fc.letrec<{ tree: Catalog }>((tie) => ({
  tree: fc.dictionary(
    fc.stringMatching(/^[a-z]{1,4}$/),
    fc.oneof({ depthSize: "small" }, fc.string({ minLength: 1 }), tie("tree")),
    { maxKeys: 4 },
  ),
})).tree;

describe("a language that falls back to the default", () => {
  it("keeps its own sentences and shows the default's where it has none", () => {
    expect(withFallback(base, { nav: { home: "Home" } })).toEqual({
      nav: { home: "Home", plans: "Planos" },
      title: "Olá",
    });
  });

  it("treats an empty sentence as missing, and drops a key the default does not have", () => {
    expect(withFallback(base, { title: "  ", extra: "x", nav: { plans: "Plans" } })).toEqual({
      nav: { home: "Início", plans: "Plans" },
      title: "Olá",
    });
  });

  it("ignores a group where the default has a sentence and the reverse", () => {
    expect(withFallback(base, { title: { x: "y" }, nav: "oops" })).toEqual(base);
  });

  it("always ends with exactly the default's keys, whatever the other language holds", () => {
    const keys = (tree: Catalog, prefix = ""): string[] =>
      Object.entries(tree).flatMap(([key, value]) =>
        typeof value === "string" ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`),
      );
    fc.assert(
      fc.property(catalog, catalog, (defaults, other) => {
        expect(keys(withFallback(defaults, other)).sort(byText)).toEqual(
          keys(defaults).sort(byText),
        );
      }),
    );
  });

  it("is the language itself once the language is complete", () => {
    fc.assert(
      fc.property(catalog, (defaults) => {
        expect(withFallback(defaults, structuredClone(defaults))).toEqual(defaults);
      }),
    );
  });
});
