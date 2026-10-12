import type { NextRequest } from "next/server";
import { corsHeaders, preflightHeaders } from "@/domain/api/cors";
import { type ApiScope, bearerOf } from "@/domain/api/tokens";
import { currentInstant } from "@/domain/clock";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { withErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit/guard";
import { timedRoute } from "@/lib/timed-route";
import type { z } from "@/lib/validation";
import { type ApiCaller, authenticateApiToken } from "./tokens";

/*
 * The door of the public API. A handler is thin: this wrapper reads the bearer token, checks its
 * scope, spends the token's own rate limit, answers any failure in the single domain error shape,
 * and adds the CORS headers for the origins the product allows. The answer is never cached, since
 * it depends on who holds the token.
 */

const API_LIMIT = { name: "api", limit: 600, windowSeconds: 3600 } as const;

/** What a handler is given: who holds the token, the request, the instant, and the route's own parts. */
export type ApiCall = {
  caller: ApiCaller;
  request: NextRequest;
  now: Date;
  /** The dynamic parts of the address, `{ id }` for `/api/v1/things/[id]`. */
  params: Readonly<Record<string, string>>;
};

/** What Next hands a route handler beside the request; a route with no dynamic part gets none. */
type RouteContext = { params: Promise<Record<string, string | string[] | undefined> | undefined> };

async function readParams(context: RouteContext): Promise<Record<string, string>> {
  const raw = (await context.params) ?? {};
  return Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
}

function withHeaders(response: Response, extra: Record<string, string>): Response {
  for (const [name, value] of Object.entries(extra)) {
    response.headers.set(name, value);
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function answer(
  request: NextRequest,
  context: RouteContext,
  scope: ApiScope,
  handler: (call: ApiCall) => Promise<unknown>,
): Promise<Response> {
  const response = await withErrorResponse(async () => {
    const now = currentInstant();
    const caller = await authenticateApiToken(
      db,
      bearerOf(request.headers.get("authorization")),
      scope,
      now,
    );
    await enforceRateLimit(API_LIMIT, `token:${caller.tokenId}`);
    const result = await handler({ caller, request, now, params: await readParams(context) });
    return result === undefined ? new Response(null, { status: 204 }) : Response.json(result);
  });
  return withHeaders(response, corsHeaders(request.headers.get("origin"), env.API_ALLOWED_ORIGINS));
}

/** A reading handler of the API, named in the log by its route pattern. */
export function apiRoute(
  pattern: string,
  scope: ApiScope,
  handler: (call: ApiCall) => Promise<unknown>,
) {
  return timedRoute(pattern, (request: NextRequest, context: RouteContext) =>
    answer(request, context, scope, handler),
  );
}

/**
 * A writing handler (`POST`, `PATCH`, `DELETE`): the body is read as JSON and checked by the same
 * zod schema the action uses, so a malformed or invalid body is a 400 before the handler runs. A
 * handler that returns nothing answers 204.
 */
export function apiWrite<Body>(
  pattern: string,
  scope: ApiScope,
  schema: z.ZodType<Body>,
  handler: (call: ApiCall & { body: Body }) => Promise<unknown>,
) {
  return apiRoute(pattern, scope, async (call) => {
    const raw: unknown = await call.request.json().catch(() => undefined);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new DomainError(400);
    }
    return handler({ ...call, body: parsed.data });
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
