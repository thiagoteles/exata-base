import type { NextRequest } from "next/server";
import { isCadence } from "@/domain/operations/cadence";
import { env } from "@/lib/env";
import { isAuthorizedCall } from "@/lib/scheduled/authorize";
import { runScheduledCall } from "@/lib/scheduled/call";
import { timedRoute } from "@/lib/timed-route";

/**
 * The scheduler's call for one cadence (`daily`, `hourly`, `every-5-min`). The secret is checked
 * before the group, so an unauthorized caller learns nothing about which groups exist.
 */
export const POST = timedRoute(
  "/events/[group]",
  async (request: NextRequest, { params }: RouteContext<"/events/[group]">) => {
    if (!isAuthorizedCall(env.CRON_SECRET, request.headers.get("authorization"))) {
      return new Response(null, { status: 401 });
    }
    const { group } = await params;
    if (!isCadence(group)) {
      return new Response(null, { status: 404 });
    }
    return await runScheduledCall(group);
  },
);
