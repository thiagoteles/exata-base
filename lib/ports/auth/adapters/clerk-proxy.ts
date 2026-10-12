import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";

type Next = (request: NextRequest, isSignedIn: boolean) => Response | Promise<Response>;

/*
 * Clerk's middleware must run on every request for `auth()` to work later. The publishable key is
 * the one the image was built with, the same the pages carry.
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
