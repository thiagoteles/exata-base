import { createHmac } from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { readUnsubscribe, signUnsubscribe, type Unsubscribable } from "./token";

const secret = "s".repeat(32);
const categories = fc.constantFrom<Unsubscribable>("reminder", "news");

describe("unsubscribe tokens", () => {
  it("read back what was signed, with the address in lower case", () => {
    fc.assert(
      fc.property(fc.emailAddress(), categories, (address, category) => {
        const token = signUnsubscribe(secret, { address, category });
        expect(readUnsubscribe(secret, token)).toEqual({
          address: address.toLowerCase(),
          category,
        });
      }),
    );
  });

  it("are made of characters that survive a URL and an e-mail", () => {
    const token = signUnsubscribe(secret, { address: "Ana+tag@Example.com", category: "news" });
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("are refused under another secret", () => {
    const token = signUnsubscribe(secret, { address: "ana@example.com", category: "news" });
    expect(readUnsubscribe("t".repeat(32), token)).toBeNull();
  });

  it("are refused when any part was changed: the address, the kind or the signature", () => {
    const [encoded = "", signature = ""] = signUnsubscribe(secret, {
      address: "ana@example.com",
      category: "reminder",
    }).split(".");
    const other = Buffer.from("news:ana@example.com").toString("base64url");
    const stranger = Buffer.from("reminder:bia@example.com").toString("base64url");
    expect(readUnsubscribe(secret, `${other}.${signature}`)).toBeNull();
    expect(readUnsubscribe(secret, `${stranger}.${signature}`)).toBeNull();
    expect(readUnsubscribe(secret, `${encoded}.${signature.slice(0, -1)}A`)).toBeNull();
    expect(readUnsubscribe(secret, `${encoded}.`)).toBeNull();
  });

  it("are refused when they are not tokens at all", () => {
    for (const token of ["", ".", "abc", "a.b.c", "....", "%%%.%%%", "x".repeat(5000)]) {
      expect(readUnsubscribe(secret, token)).toBeNull();
    }
  });

  it("do not accept a signature made for another purpose", () => {
    // The same payload signed without the purpose in front, as another feature of the app might.
    const payload = "news:ana@example.com";
    const foreign = createHmac("sha256", secret).update(payload).digest("base64url");
    const token = `${Buffer.from(payload).toString("base64url")}.${foreign}`;
    expect(readUnsubscribe(secret, token)).toBeNull();
  });

  it("never reads a statement about transactional mail, which has no unsubscribe", () => {
    const payload = "transactional:ana@example.com";
    const signature = createHmac("sha256", secret)
      .update(`unsubscribe\n${payload}`)
      .digest("base64url");
    expect(
      readUnsubscribe(secret, `${Buffer.from(payload).toString("base64url")}.${signature}`),
    ).toBeNull();
  });
});
