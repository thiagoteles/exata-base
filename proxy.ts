import { type NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isMultilingual, LOCALE_HEADER } from "@/lib/i18n/locales";
import { decideLanguage, redirectToLanguage, rememberLocale } from "@/lib/i18n/proxy";
import { internalPathOf, publicPathOf } from "@/lib/i18n/public-paths";
import { isMissingPage } from "@/lib/known-pages";
import { authProxy } from "@/lib/ports/auth/proxy";
import { REQUEST_ID_HEADER, requestIdFrom } from "@/lib/request-id";

const PERMANENT = 301;
const MISSING_PAGE = "/_missing";
// Marks a request this proxy already rewrote. In production Next passes a rewritten request through
// the proxy again to resume a prerendered page, now at the route address; without the mark that
// second pass would answer the route address with the redirect, and the page would never load. A
// caller who sends the mark only skips the redirect and still gets the same page.
const REWRITTEN_HEADER = "x-public-address";

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const requestId = requestIdFrom(request.headers);
  const decision = isMultilingual ? decideLanguage(request) : null;
  if (decision?.redirectTo) {
    return redirectToLanguage(request, decision);
  }
  const visible = request.nextUrl.pathname;
  const unprefixed = decision?.pathname ?? visible;
  const prefix = visible.slice(0, visible.length - unprefixed.length);

  // A route address that has a public twin is sent there, so only one address is indexed. Only
  // page loads move; a form posted to the old address is still answered where it was sent.
  const twin = publicPathOf(unprefixed);
  const isPageLoad = request.method === "GET" || request.method === "HEAD";
  if (twin !== null && isPageLoad && !request.headers.has(REWRITTEN_HEADER)) {
    const target = new URL(`${prefix}${twin}`, env.APP_URL);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target, PERMANENT);
  }

  // The routes are written in English and without a language prefix: a public or prefixed address
  // is served from its route, and the auth guard below sees that route address.
  const clean = new URL(request.url);
  clean.pathname = internalPathOf(unprefixed) ?? unprefixed;
  // A dynamic page that does not exist is sent where no route matches, so Next answers its
  // not-found page with a real 404 instead of a 200 shell that later says "not found".
  if (isMissingPage(clean.pathname)) {
    clean.pathname = MISSING_PAGE;
  }
  const rewritten = clean.pathname !== visible;
  const seen = rewritten ? new NextRequest(clean, request) : request;
  return authProxy(seen, event, (forwarded) => {
    const headers = new Headers(forwarded.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    if (rewritten) {
      headers.set(REWRITTEN_HEADER, visible);
    }
    if (decision !== null) {
      headers.set(LOCALE_HEADER, decision.locale);
    }
    const response = rewritten
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
