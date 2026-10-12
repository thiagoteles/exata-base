/*
 * Reads a browser's CSP violation report. Browsers send two shapes: the older `csp-report` object
 * and the Reporting API's list of `csp-violation` reports. Only what tells a violation apart is
 * kept, and an address keeps its origin alone, because a path or a query can carry personal data.
 */

export type Violation = { directive: string; blocked: string; page: string };

const MAX_VIOLATIONS = 20;
const blockedKeywords = new Set(["inline", "eval", "self", "data", "blob", "wasm-eval"]);

function originOf(value: unknown): string {
  if (typeof value !== "string" || value === "") {
    return "unknown";
  }
  if (blockedKeywords.has(value)) {
    return value;
  }
  try {
    return new URL(value).origin;
  } catch {
    return "unknown";
  }
}

function pathOf(value: unknown): string {
  try {
    return typeof value === "string" ? new URL(value).pathname : "unknown";
  } catch {
    return "unknown";
  }
}

const field = (body: Record<string, unknown>, ...names: string[]) =>
  names.map((name) => body[name]).find((value) => typeof value === "string");

function violationOf(body: unknown): Violation | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const directive = field(
    record,
    "effectiveDirective",
    "effective-directive",
    "violated-directive",
  );
  if (typeof directive !== "string") {
    return null;
  }
  return {
    directive: directive.split(" ")[0] ?? directive,
    blocked: originOf(field(record, "blockedURL", "blocked-uri")),
    page: pathOf(field(record, "documentURL", "document-uri")),
  };
}

export function readViolations(payload: unknown): Violation[] {
  const reports = Array.isArray(payload)
    ? payload
        .filter((report) => (report as { type?: unknown } | null)?.type === "csp-violation")
        .map((report) => (report as { body?: unknown }).body)
    : [(payload as { "csp-report"?: unknown } | null)?.["csp-report"]];
  return reports
    .map(violationOf)
    .filter((violation): violation is Violation => violation !== null)
    .slice(0, MAX_VIOLATIONS);
}
