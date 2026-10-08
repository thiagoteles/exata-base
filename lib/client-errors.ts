import { createHash } from "node:crypto";
import { z } from "@/lib/validation";

/*
 * What the browser reports when a page breaks. The shape is fixed and small on purpose: the route
 * is open to anyone, so it accepts only these fields, only up to a fixed size, and writes each
 * distinct error once a minute per browser.
 */

export const MAX_REPORT_BYTES = 8192;
const DEDUPE_WINDOW_MS = 60_000;

const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_PATH = 300;
const MAX_DIGEST = 100;

export const clientErrorSchema = z.strictObject({
  source: z.enum(["page", "global"]),
  message: z.string().max(MAX_MESSAGE),
  path: z.string().startsWith("/").max(MAX_PATH),
  digest: z.string().max(MAX_DIGEST).optional(),
  stack: z.string().max(MAX_STACK).optional(),
});

export type ClientErrorReport = z.output<typeof clientErrorSchema>;

/** Who is reporting, as far as a server can tell: the address and the browser, hashed together. */
export function browserKey(address: string, userAgent: string): string {
  return createHash("sha256").update(`${address}\n${userAgent}`).digest("base64url");
}

/** The same error on the same page from the same browser has the same fingerprint. */
export function fingerprint(browser: string, report: ClientErrorReport): string {
  return createHash("sha256")
    .update(`${browser}\n${report.source}\n${report.path}\n${report.digest ?? report.message}`)
    .digest("base64url");
}

/** Remembers what it saw for one window. `firstTime` is true once per key per window. */
export function createDeduper(windowMs: number = DEDUPE_WINDOW_MS) {
  const seen = new Map<string, number>();
  return {
    firstTime(key: string, now: number = Date.now()): boolean {
      for (const [stored, at] of seen) {
        if (now - at >= windowMs) {
          seen.delete(stored);
        }
      }
      if (seen.has(key)) {
        return false;
      }
      seen.set(key, now);
      return true;
    },
  };
}
