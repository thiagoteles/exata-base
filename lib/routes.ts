/*
 * Paths the auth layer needs to know. Signed-out visitors who open a protected path are sent to
 * sign-in, with the path they wanted kept for the way back.
 */

const SIGN_IN_PATH = "/sign-in";

export const protectedPrefixes = ["/account", "/staff", "/admin", "/catalog"] as const;

export function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const internalPath = /^\/(?![/\\])[^\s]*$/;

/**
 * The path to return to after sign-in. Only a path on this site is accepted: anything that could
 * leave it (another origin, `//host`, `/\host`, a scheme) falls back to the home page.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (value === null || value === undefined || !internalPath.test(value)) {
    return "/";
  }
  const resolved = new URL(value, "http://internal.invalid");
  return resolved.origin === "http://internal.invalid"
    ? `${resolved.pathname}${resolved.search}${resolved.hash}`
    : "/";
}

export function signInRedirect(pathname: string, search: string): string {
  return `${SIGN_IN_PATH}?next=${encodeURIComponent(`${pathname}${search}`)}`;
}
