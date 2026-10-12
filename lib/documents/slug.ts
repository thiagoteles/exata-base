import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * The address in a document's QR code. It is a signed statement ("this kind of document, this
 * record"), not a row: only the server can make the signature, so a visitor cannot invent an
 * address that looks real, and nothing is stored. What the page then shows is read from the record,
 * so it is always the current truth about that document.
 */

const documentKinds = ["receipt"] as const;
type DocumentKind = (typeof documentKinds)[number];
export type DocumentRef = { kind: DocumentKind; id: string };

const SEPARATOR = ".";
// The signature covers a purpose, so one made for another use never fits here.
const PURPOSE = "document\n";

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret)
    .update(PURPOSE + payload)
    .digest("base64url");

export function signDocument(secret: string, { kind, id }: DocumentRef): string {
  const payload = `${kind}:${id}`;
  return `${Buffer.from(payload).toString("base64url")}${SEPARATOR}${sign(secret, payload)}`;
}

const isKind = (value: string): value is DocumentKind =>
  (documentKinds as readonly string[]).includes(value);

/** The statement an address makes, or null when this secret did not sign it. */
export function readDocument(secret: string, slug: string): DocumentRef | null {
  const [encoded, signature, ...rest] = slug.split(SEPARATOR);
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
  const kind = payload.slice(0, at);
  const id = payload.slice(at + 1);
  return isKind(kind) && id !== "" ? { kind, id } : null;
}
