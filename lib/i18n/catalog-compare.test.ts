import { describe, expect, it } from "vitest";
import { compareCatalogs, messageArguments } from "./catalog-compare";

describe("ICU arguments", () => {
  it("reads simple and plural arguments and ignores branch text", () => {
    expect(messageArguments("Olá {name}")).toEqual(["name"]);
    expect(messageArguments("{count, plural, one {# item de {owner}} other {# itens}}")).toEqual([
      "count",
      "owner",
    ]);
    expect(messageArguments("sem argumento")).toEqual([]);
  });
});

describe("comparing a catalog with the default", () => {
  const base = { a: { b: "Olá {name}" }, c: "texto" };

  it("accepts the same keys and arguments in another language", () => {
    expect(compareCatalogs(base, { a: { b: "Hello {name}" }, c: "text" })).toEqual([]);
  });

  it("names a missing key, an extra key and a changed argument", () => {
    expect(compareCatalogs(base, { a: { b: "Hello {name}" } })).toEqual(["missing key: c"]);
    expect(compareCatalogs(base, { a: { b: "Hello {name}" }, c: "t", d: "x" })).toEqual([
      "extra key: d",
    ]);
    expect(compareCatalogs(base, { a: { b: "Hello {person}" }, c: "t" })).toEqual([
      "different arguments in: a.b",
    ]);
  });
});
