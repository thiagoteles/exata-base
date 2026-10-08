import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isProtectedPath, signInRedirect } from "@/lib/routes";

/*
 * The proxy's part of auth. It only redirects a visitor with no session away from protected
 * paths; the check that counts runs on the server, in requireUser and in the action middleware.
 * In Clerk mode it also runs Clerk's middleware, which `auth()` needs on every request.
 */

type Next = (request: NextRequest) => Response | Promise<Response>;

function guard(next: Next) {
  return (request: NextRequest, isSignedIn: boolean) => {
    const { pathname, search } = request.nextUrl;
    if (!isSignedIn && isProtectedPath(pathname)) {
      return NextResponse.redirect(new URL(signInRedirect(pathname, search), request.url));
    }
    return next(request);
  };
}

export async function authProxy(
  request: NextRequest,
  event: NextFetchEvent,
  next: Next,
): Promise<Response> {
  if (env.AUTH_PROVIDER === "clerk") {
    const { runClerkProxy } = await import("./adapters/clerk-proxy");
    const response = await runClerkProxy(request, event, env.CLERK_PUBLISHABLE_KEY, guard(next));
    return response ?? next(request);
  }
  const { hasLocalSessionCookie } = await import("./adapters/local-proxy");
  return guard(next)(request, hasLocalSessionCookie(request));
}
