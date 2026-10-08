import type { Instrumentation } from "next";
import { REQUEST_ID_HEADER } from "@/lib/request-id";

// NEXT_RUNTIME is replaced at build time, so the Edge bundle drops each Node-only branch below.

export async function register() {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    const { startServer } = await import("@/lib/server-startup");
    await startServer();
  }
}

// Every server error that escapes a page, route, action or the proxy is written once, with the
// request id the error page shows.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") {
    return;
  }
  const { logger } = await import("@/lib/ports/log");
  const requestId = request.headers[REQUEST_ID_HEADER];
  logger.error("unhandled server error", {
    error,
    requestId: typeof requestId === "string" ? requestId : "unknown",
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
