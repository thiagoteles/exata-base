import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { readDocument, signDocument } from "./slug";

const secret = "s".repeat(32);
const id = "0c6f5c1e-3f4a-4a56-9f0e-8a1d7e5b2c31";

describe("a document address", () => {
  it("reads back the statement it was signed for", () => {
    expect(readDocument(secret, signDocument(secret, { kind: "receipt", id }))).toEqual({
      kind: "receipt",
      id,
    });
  });

  it("is refused under another secret, and for anything that was not signed", () => {
    const slug = signDocument(secret, { kind: "receipt", id });
    expect(readDocument("t".repeat(32), slug)).toBeNull();
    for (const bad of ["", ".", "abc", "a.b.c", `${slug}x`, `x${slug}`]) {
      expect(readDocument(secret, bad)).toBeNull();
    }
  });

  it("does not fit the address of another purpose that shares the secret", () => {
    // The unsubscribe signature uses the same construction with its own purpose line.
    const payload = Buffer.from(`receipt:${id}`).toString("base64url");
    expect(readDocument(secret, `${payload}.AAAA`)).toBeNull();
  });

  it("is refused when any single character is changed", () => {
    const slug = signDocument(secret, { kind: "receipt", id });
    fc.assert(
      fc.property(fc.nat(slug.length - 1), fc.constantFrom("A", "b", "0", "-", "_"), (at, char) => {
        fc.pre(slug[at] !== char);
        const changed = `${slug.slice(0, at)}${char}${slug.slice(at + 1)}`;
        expect(readDocument(secret, changed)).toBeNull();
      }),
    );
  });
});
