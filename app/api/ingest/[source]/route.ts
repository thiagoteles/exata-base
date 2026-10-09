import type { NextRequest } from "next/server";
import { currentInstant } from "@/domain/clock";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { withErrorResponse } from "@/lib/http";
import { handleIngest } from "@/lib/ingest/handle";
import { ingestSources } from "@/lib/ingest/sources";
import { enforceRateLimit } from "@/lib/rate-limit/guard";
import { timedRoute } from "@/lib/timed-route";

const WINDOW_SECONDS = 3600;
const LIMIT_PER_HOUR = 1200;

/** Where a worker outside the server delivers what it collected, with the secret of its source. */
export const POST = timedRoute(
  "/api/ingest/[source]",
  (request: NextRequest, { params }: RouteContext<"/api/ingest/[source]">) =>
    withErrorResponse(async () => {
      const { source } = await params;
      const declared = request.headers.get("content-length");
      const result = await handleIngest(
        {
          db,
          sources: ingestSources,
          secrets: env.INGEST_SECRETS,
          now: currentInstant(),
          enforceLimit: (name) =>
            enforceRateLimit(
              { name: "ingest", limit: LIMIT_PER_HOUR, windowSeconds: WINDOW_SECONDS },
              `source:${name}`,
            ),
        },
        {
          source,
          authorization: request.headers.get("authorization"),
          contentLength: declared === null ? null : Number(declared),
          readBody: () => request.text(),
        },
      );
      return Response.json({ result });
    }),
);
