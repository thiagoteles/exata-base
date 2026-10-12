/*
 * The Content Security Policy, assembled from what each part of the app declares it loads. It is
 * sent as Report-Only first: violations reach the log and nothing breaks, and the policy is enforced
 * only after a period with no unexpected report. There is no nonce, so the static shell stays
 * static; inline scripts are therefore allowed, and the policy's value is in the origins it closes.
 */

type Directive =
  | "script-src"
  | "style-src"
  | "img-src"
  | "font-src"
  | "connect-src"
  | "frame-src"
  | "worker-src"
  | "media-src";

export type CspSources = Partial<Record<Directive, readonly string[]>>;

const CSP_REPORT_PATH = "/api/csp-report";

const base: Record<Directive | "default-src", readonly string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
  "frame-src": ["'none'"],
  "worker-src": ["'self'", "blob:"],
  "media-src": ["'self'", "blob:"],
};

/** The policy text for the given sources. Development adds what the dev server needs. */
export function buildCsp(
  sources: readonly CspSources[],
  { development }: { development: boolean },
) {
  const merged = new Map<string, Set<string>>(
    Object.entries(base).map(([directive, values]) => [directive, new Set(values)]),
  );
  for (const declared of sources) {
    for (const [directive, values] of Object.entries(declared)) {
      const set = merged.get(directive) ?? new Set();
      set.delete("'none'");
      for (const value of values ?? []) {
        set.add(value);
      }
      merged.set(directive, set);
    }
  }
  if (development) {
    merged.get("script-src")?.add("'unsafe-eval'");
    merged.get("connect-src")?.add("ws:");
  }
  const directives = [...merged].map(
    ([directive, values]) => `${directive} ${[...values].join(" ")}`,
  );
  return [
    ...directives,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // report-uri alone: when report-to is present Chrome ignores report-uri, and its batched
    // Reporting API delivery never arrived in testing; report-uri arrives at once in every browser.
    `report-uri ${CSP_REPORT_PATH}`,
  ].join("; ");
}

const trailingDollar = /\$$/;
const hostShape = /^[a-z0-9.-]+$/i;

/** The Clerk Frontend API host, which the publishable key carries in base64 after its prefix. */
export function clerkFrontendHost(publishableKey: string): string | null {
  const [, , encoded] = publishableKey.split("_");
  if (encoded === undefined) {
    return null;
  }
  const decoded = Buffer.from(encoded, "base64").toString("utf8").replace(trailingDollar, "");
  return hostShape.test(decoded) ? decoded : null;
}
