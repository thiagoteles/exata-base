import { type NextRequest, NextResponse } from "next/server";
import { afterSignIn } from "@/lib/accounts/sign-in-complete";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { requireUser } from "@/lib/ports/auth";
import { signInRedirect } from "@/lib/routes";
import { ONE_YEAR_SECONDS } from "@/lib/theme";
import { timedRoute } from "@/lib/timed-route";

/*
 * Every sign-in, in both modes, ends here. The app has the person's row by now, so their saved
 * theme is copied to the cookie the first paint reads, and they go on to where they were headed.
 * The address is built from APP_URL, not from the request, which behind a proxy has the wrong host.
 */
export const GET = timedRoute("/auth/complete", async (request: NextRequest) => {
  const next = request.nextUrl.searchParams.get("next");
  try {
    const user = await requireUser();
    const { location, cookies } = afterSignIn(user.options, next);
    const response = NextResponse.redirect(new URL(location, env.APP_URL));
    for (const { name, value } of cookies) {
      if (value === null) {
        response.cookies.delete(name);
      } else {
        response.cookies.set(name, value, { path: "/", maxAge: ONE_YEAR_SECONDS, sameSite: "lax" });
      }
    }
    return response;
  } catch (error) {
    if (error instanceof DomainError && error.status === 401) {
      return NextResponse.redirect(new URL(signInRedirect("/", ""), env.APP_URL));
    }
    throw error;
  }
});
