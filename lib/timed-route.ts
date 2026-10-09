import { logger } from "@/lib/ports/log";

/*
 * Every route handler is wrapped here, so its duration reaches the log with the route's name (the
 * pattern, not the address, so "/storage/[...key]" groups every file), the method and the status.
 * A handler that throws is logged as 500 and the error goes on to Next's own error report.
 */
export function timedRoute<Args extends unknown[]>(
  route: string,
  handler: (...args: Args) => Response | Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    const started = performance.now();
    const [request] = args;
    let status = 500;
    try {
      const response = await handler(...args);
      ({ status } = response);
      return response;
    } finally {
      logger.info("route finished", {
        route,
        method: request instanceof Request ? request.method : "GET",
        ms: Math.round(performance.now() - started),
        status,
      });
    }
  };
}
