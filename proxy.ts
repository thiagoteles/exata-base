import { type NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { isMultilingual, LOCALE_HEADER } from "@/lib/i18n/locales";
import { decideLanguage, redirectToLanguage, rememberLocale } from "@/lib/i18n/proxy";
import { authProxy } from "@/lib/ports/auth/proxy";
import { REQUEST_ID_HEADER, requestIdFrom } from "@/lib/request-id";

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const requestId = requestIdFrom(request.headers);
  const decision = isMultilingual ? decideLanguage(request) : null;
  if (decision?.redirectTo) {
    return redirectToLanguage(request, decision);
  }
  // The routes are written without a language prefix: a prefixed address is served from its clean
  // twin, and the auth guard below sees that clean address.
  const clean = new URL(request.url);
  if (decision !== null) {
    clean.pathname = decision.pathname;
  }
  const seen = decision === null ? request : new NextRequest(clean, request);
  return authProxy(seen, event, (forwarded) => {
    const headers = new Headers(forwarded.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    if (decision !== null) {
      headers.set(LOCALE_HEADER, decision.locale);
    }
    const prefixed = decision !== null && decision.pathname !== request.nextUrl.pathname;
    const response = prefixed
      ? NextResponse.rewrite(clean, { request: { headers } })
      : NextResponse.next({ request: { headers } });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return decision === null ? response : rememberLocale(response, decision.locale);
  });
}

export const config = {
  matcher: [
    // biome-ignore lint/security/noSecrets: a route pattern, not a credential
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)",
  ],
};
