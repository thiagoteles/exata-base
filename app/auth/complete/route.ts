import { type NextRequest, NextResponse } from "next/server";
import { afterSignIn } from "@/lib/accounts/sign-in-complete";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";
import { requireUser } from "@/lib/ports/auth";
import { signInRedirect } from "@/lib/routes";
import { ONE_YEAR_SECONDS, THEME_COOKIE } from "@/lib/theme";

/*
 * Every sign-in, in both modes, ends here. The app has the person's row by now, so their saved
 * theme is copied to the cookie the first paint reads, and they go on to where they were headed.
 * The address is built from APP_URL, not from the request, which behind a proxy has the wrong host.
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");
  try {
    const user = await requireUser();
    const { location, theme, locale } = afterSignIn(user.options, next);
    const response = NextResponse.redirect(new URL(location, env.APP_URL));
    if (theme !== null) {
      response.cookies.set(THEME_COOKIE, theme, {
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
        sameSite: "lax",
      });
    }
    if (locale !== null) {
      response.cookies.set(LOCALE_COOKIE, locale, {
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
        sameSite: "lax",
      });
    }
    return response;
  } catch (error) {
    if (error instanceof DomainError && error.status === 401) {
      return NextResponse.redirect(new URL(signInRedirect("/", ""), env.APP_URL));
    }
    throw error;
  }
}
