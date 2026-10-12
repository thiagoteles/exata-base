import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { LOCALE_COOKIE, type Locale } from "./locales";
import { type Negotiation, negotiate } from "./negotiate";

/*
 * The proxy's part of the language. It only runs when the product has more than one language.
 * Routes that are not pages (webhooks, files, health, icons) are left alone.
 */

const untouched = [
  "/api",
  "/events",
  "/health",
  "/storage",
  "/auth/complete",
  "/icon",
  "/apple-icon",
  "/opengraph-image",
  "/manifest.webmanifest",
];

const isUntouched = (pathname: string) =>
  untouched.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const ONE_YEAR_SECONDS = 31_536_000;

export function rememberLocale(response: NextResponse, locale: Locale): NextResponse {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  return response;
}

export function decideLanguage(request: NextRequest): Negotiation | null {
  const { pathname } = request.nextUrl;
  if (isUntouched(pathname)) {
    return null;
  }
  return negotiate({
    pathname,
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get("accept-language"),
    canRedirect: request.method === "GET" || request.method === "HEAD",
  });
}

/** The address a browser should be sent to, built on APP_URL because the request's host may be an internal one. */
export function redirectToLanguage(request: NextRequest, decision: Negotiation): NextResponse {
  const target = new URL(decision.redirectTo ?? "/", env.APP_URL);
  target.search = request.nextUrl.search;
  return rememberLocale(NextResponse.redirect(target), decision.locale);
}
