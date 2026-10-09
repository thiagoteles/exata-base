import { type NextRequest, NextResponse } from "next/server";
import { currentInstant } from "@/domain/clock";
import { afterSignIn } from "@/lib/accounts/sign-in-complete";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { requireUser } from "@/lib/ports/auth";
import { logger } from "@/lib/ports/log";
import { savePreference } from "@/lib/preferences/service";
import { REFERRAL_COOKIE } from "@/lib/referral/cookie";
import { recordReferral } from "@/lib/referral/service";
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
    const browser = Object.fromEntries(
      request.cookies.getAll().map(({ name, value }) => [name, value]),
    );
    const { location, cookies, save } = afterSignIn(user.options, browser, next);
    for (const { key, value } of save) {
      // biome-ignore lint/performance/noAwaitInLoops: a few preferences, saved one after the other
      await savePreference(db, user.id, key, value);
    }
    const response = NextResponse.redirect(new URL(location, env.APP_URL));
    // The inviter's link, if this browser arrived by one, is weighed now and then forgotten. It
    // never stops a sign-in: whatever goes wrong is logged and the person goes on.
    const invitedBy = request.cookies.get(REFERRAL_COOKIE)?.value;
    if (invitedBy !== undefined) {
      await recordReferral(db, {
        referredId: user.id,
        rawCode: invitedBy,
        now: currentInstant(),
      }).catch((error: unknown) => logger.warn("referral not recorded", { error }));
      response.cookies.delete(REFERRAL_COOKIE);
    }
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
