import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

type Next = (request: NextRequest, isSignedIn: boolean) => Response | Promise<Response>;

/*
 * Clerk's middleware must run on every request for `auth()` to work later. The publishable key is
 * passed here at runtime, so no NEXT_PUBLIC_ variable is baked into the build.
 */
export function runClerkProxy(
  request: NextRequest,
  event: NextFetchEvent,
  publishableKey: string | undefined,
  next: Next,
) {
  const middleware = clerkMiddleware(
    async (clerkAuth, clerkRequest) => {
      const { userId } = await clerkAuth();
      return next(clerkRequest, userId !== null);
    },
    publishableKey === undefined ? {} : { publishableKey },
  );
  return middleware(request, event);
}
