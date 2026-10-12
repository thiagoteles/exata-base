import type { Instrumentation } from "next";
import { REQUEST_ID_HEADER } from "@/lib/request-id";

// NEXT_RUNTIME is replaced at build time, so the Edge bundle drops each Node-only branch below.
// Webpack replaces only the dotted form, `process.env.NEXT_RUNTIME`; with brackets the Node-only
// imports would stay in the Edge bundle.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startServer } = await import("@/lib/server-startup");
    await startServer();
  }
}

// Every server error that escapes a page, route, action or the proxy is written once, with the
// request id the error page shows.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // The import sits inside the branch: webpack drops a block whose condition it knows is false, but
  // not the code after an early return.
  if (process.env.NEXT_RUNTIME === "nodejs") {
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
  }
};

declare global {
  // biome-ignore lint/style/noNamespace: the Node types declare the environment in this namespace
  namespace NodeJS {
    // biome-ignore lint/style/useConsistentTypeDefinitions: augmenting an interface takes an interface
    interface ProcessEnv {
      /** Which runtime a bundle is for; Next writes it in at build time. */
      readonly NEXT_RUNTIME?: "nodejs" | "edge";
    }
  }
}
