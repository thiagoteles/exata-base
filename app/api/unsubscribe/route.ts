import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { withErrorResponse } from "@/lib/http";
import { publicHref } from "@/lib/i18n/public-paths";
import { enforceRateLimit, requestAddressSubject } from "@/lib/rate-limit/guard";
import { timedRoute } from "@/lib/timed-route";
import { applyUnsubscribe } from "@/lib/unsubscribe/service";
import { readUnsubscribe } from "@/lib/unsubscribe/token";

const LIMIT_PER_HOUR = 60;
const WINDOW_SECONDS = 3600;

/**
 * The address a mail client calls from its own "unsubscribe" button: a POST with the token in the
 * query and no screen in between (RFC 8058). The statement is signed, so the call needs no session.
 */
export const POST = timedRoute("/api/unsubscribe", (request: NextRequest) =>
  withErrorResponse(async () => {
    await enforceRateLimit(
      { name: "unsubscribe", limit: LIMIT_PER_HOUR, windowSeconds: WINDOW_SECONDS },
      await requestAddressSubject(),
    );
    const statement = readUnsubscribe(
      env.UNSUBSCRIBE_SECRET,
      request.nextUrl.searchParams.get("token") ?? "",
    );
    if (statement === null) {
      throw new DomainError(400);
    }
    await applyUnsubscribe(db, statement);
    return Response.json({ done: true });
  }),
);

/** A client that cannot POST, or a person who pastes the link, lands on the page that asks first. */
export const GET = timedRoute("/api/unsubscribe", (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const target = new URL(publicHref("/unsubscribe"), env.APP_URL);
  target.searchParams.set("token", token);
  return Promise.resolve(NextResponse.redirect(target, 303));
});
