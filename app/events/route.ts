import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isAuthorizedCall } from "@/lib/scheduled/authorize";
import { runScheduledCall } from "@/lib/scheduled/call";
import { timedRoute } from "@/lib/timed-route";

/**
 * The daily call from the scheduler, kept at its first address: the same as `/events/daily`. POST
 * only, with the secret in the Authorization header.
 */
export const POST = timedRoute("/events", async (request: NextRequest) => {
  if (!isAuthorizedCall(env.CRON_SECRET, request.headers.get("authorization"))) {
    return new Response(null, { status: 401 });
  }
  return await runScheduledCall("daily");
});
