/*
 * Which browsers may call the API. The list is exact origins the product names; there is no
 * wildcard, because a token in a header already proves the caller and the list only decides which
 * web pages may read the answer. Credentials are never allowed, since the API reads no cookie.
 */

const METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const HEADERS = "Authorization, Content-Type";
const PREFLIGHT_SECONDS = 600;

const isAllowed = (origin: string | null, allowed: readonly string[]): origin is string =>
  origin !== null && allowed.includes(origin);

/** The headers for an answer to a caller from `origin`. Always varies by origin, so a cache cannot mix them. */
export function corsHeaders(
  origin: string | null,
  allowed: readonly string[],
): Record<string, string> {
  return isAllowed(origin, allowed)
    ? { Vary: "Origin", "Access-Control-Allow-Origin": origin }
    : { Vary: "Origin" };
}

/** The headers a preflight request is answered with. */
export function preflightHeaders(
  origin: string | null,
  allowed: readonly string[],
): Record<string, string> {
  return isAllowed(origin, allowed)
    ? {
        ...corsHeaders(origin, allowed),
        "Access-Control-Allow-Methods": METHODS,
        "Access-Control-Allow-Headers": HEADERS,
        "Access-Control-Max-Age": String(PREFLIGHT_SECONDS),
      }
    : corsHeaders(origin, allowed);
}
