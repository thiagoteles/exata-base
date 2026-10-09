import type { NextRequest } from "next/server";
import { corsHeaders, preflightHeaders } from "@/domain/api/cors";
import { type ApiScope, bearerOf } from "@/domain/api/tokens";
import { currentInstant } from "@/domain/clock";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { withErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit/guard";
import { timedRoute } from "@/lib/timed-route";
import { type ApiCaller, authenticateApiToken } from "./tokens";

/*
 * The door of the public API. A handler is thin: this wrapper reads the bearer token, checks its
 * scope, spends the token's own rate limit, answers any failure in the single domain error shape,
 * and adds the CORS headers for the origins the product allows. The answer is never cached, since
 * it depends on who holds the token.
 */

const API_LIMIT = { name: "api", limit: 600, windowSeconds: 3600 } as const;

export type ApiCall = { caller: ApiCaller; request: NextRequest; now: Date };

function withHeaders(response: Response, extra: Record<string, string>): Response {
  for (const [name, value] of Object.entries(extra)) {
    response.headers.set(name, value);
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/** A `GET`-style handler of the API, named in the log by its route pattern. */
export function apiRoute(
  pattern: string,
  scope: ApiScope,
  handler: (call: ApiCall) => Promise<unknown>,
) {
  return timedRoute(pattern, async (request: NextRequest) => {
    const response = await withErrorResponse(async () => {
      const now = currentInstant();
      const caller = await authenticateApiToken(
        db,
        bearerOf(request.headers.get("authorization")),
        scope,
        now,
      );
      await enforceRateLimit(API_LIMIT, `token:${caller.tokenId}`);
      return Response.json(await handler({ caller, request, now }));
    });
    return withHeaders(
      response,
      corsHeaders(request.headers.get("origin"), env.API_ALLOWED_ORIGINS),
    );
  });
}

/** The answer to a browser's question before a call: which origins, methods and headers are allowed. */
export const apiPreflight = (pattern: string) =>
  timedRoute(pattern, (request: NextRequest) =>
    withHeaders(
      new Response(null, { status: 204 }),
      preflightHeaders(request.headers.get("origin"), env.API_ALLOWED_ORIGINS),
    ),
  );
