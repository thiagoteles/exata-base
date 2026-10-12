import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * The link in a reminder or a newsletter that stops it. It is a signed statement, not a row: the
 * token says "this address, this kind of mail" and carries a signature only the server can make,
 * so there is nothing to store, nothing to look up and nothing to expire. A link in an old message
 * keeps working for good, which is what an unsubscribe link has to do.
 */

export type Unsubscribable = "reminder" | "news";
export type Unsubscription = { address: string; category: Unsubscribable };

const categories: readonly string[] = ["reminder", "news"];
const SEPARATOR = ".";
// The signature covers a purpose too, so a signature made for something else never fits here.
const PURPOSE = "unsubscribe\n";

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret)
    .update(PURPOSE + payload)
    .digest("base64url");

export function signUnsubscribe(secret: string, { address, category }: Unsubscription): string {
  const payload = `${category}:${address.toLowerCase()}`;
  return `${Buffer.from(payload).toString("base64url")}${SEPARATOR}${sign(secret, payload)}`;
}

/** The statement a token makes, or null when it is not one this secret signed. */
export function readUnsubscribe(secret: string, token: string): Unsubscription | null {
  const [encoded, signature, ...rest] = token.split(SEPARATOR);
  if (encoded === undefined || signature === undefined || rest.length > 0) {
    return null;
  }
  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = Buffer.from(sign(secret, payload));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  const at = payload.indexOf(":");
  const category = payload.slice(0, at);
  const address = payload.slice(at + 1);
  return categories.includes(category) && address !== ""
    ? { address, category: category as Unsubscribable }
    : null;
}
