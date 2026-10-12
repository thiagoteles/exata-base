import { clientAddress, type TrustedProxy } from "./client-address";

/*
 * One access record, as the Marco Civil (art. 15) asks of an application run for profit: the
 * address, with its source port when the proxy passes it (needed to tell apart customers behind
 * a shared carrier address), and the time with its zone. The path goes without its query, which
 * can carry personal data; who was signed in is not recorded here.
 */
export type AccessRecord = {
  logName: "access";
  address: string;
  port: string | null;
  at: string;
  method: string;
  path: string;
};

export function accessRecord(
  request: { headers: Headers; method: string; path: string },
  proxy: TrustedProxy,
  now: Date,
): AccessRecord {
  const port =
    proxy === "cloudflare"
      ? request.headers.get("cf-connecting-port")
      : request.headers.get("x-forwarded-client-port");
  return {
    logName: "access",
    address: clientAddress(request.headers, proxy) ?? "unknown",
    port: port?.trim() || null,
    at: now.toISOString(),
    method: request.method,
    path: request.path,
  };
}
