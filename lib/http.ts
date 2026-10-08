import { headers } from "next/headers";
import { errorBody } from "@/lib/errors";
import { logger } from "@/lib/ports/log";
import { REQUEST_ID_HEADER } from "@/lib/request-id";

/** Runs a route handler and turns any error into the single domain error response. */
export async function withErrorResponse(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    const requestId = (await headers()).get(REQUEST_ID_HEADER) ?? "unknown";
    const body = errorBody(error, requestId);
    if (body.error.status === 500) {
      logger.error("route failed", { error, requestId });
    }
    return Response.json(body, { status: body.error.status });
  }
}
