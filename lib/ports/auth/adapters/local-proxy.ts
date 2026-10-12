import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";

/** The optimistic check: is there a session cookie at all? The real check runs on the server. */
export function hasLocalSessionCookie(request: NextRequest): boolean {
  return getSessionCookie(request) !== null;
}
