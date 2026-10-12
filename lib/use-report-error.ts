"use client";

import { useEffect } from "react";

type Source = "page" | "global";

/** Tells the server about an error the error screen is showing. A failed report is ignored. */
export function useReportError(error: Error & { digest?: string }, source: Source) {
  useEffect(() => {
    const report = JSON.stringify({
      source,
      message: error.message.slice(0, 500),
      path: globalThis.location.pathname,
      ...(error.digest === undefined ? {} : { digest: error.digest }),
      ...(error.stack === undefined ? {} : { stack: error.stack.slice(0, 4000) }),
    });
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: report,
      keepalive: true,
    }).catch(() => undefined);
  }, [error, source]);
}
