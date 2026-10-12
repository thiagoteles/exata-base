/*
 * The client's address, as written by the proxy the product trusts. Whatever the caller sends in
 * X-Forwarded-For is kept in front of the list; Traefik appends the address it saw at the end, so
 * only the last value is trusted. Behind Cloudflare the trusted value is CF-Connecting-IP.
 */

export type TrustedProxy = "traefik" | "cloudflare";

export function clientAddress(headers: Headers, proxy: TrustedProxy): string | null {
  if (proxy === "cloudflare") {
    return headers.get("cf-connecting-ip")?.trim() || null;
  }
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || null;
}
