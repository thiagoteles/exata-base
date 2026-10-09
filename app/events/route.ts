import type { NextRequest } from "next/server";
import { currentInstant } from "@/domain/clock";
import { isAuthorizedCall } from "@/lib/daily/authorize";
import { dailyOperations } from "@/lib/daily/registry";
import { runDailyOperations } from "@/lib/daily/run";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/ports/log";

/** The daily call from the scheduler. POST only, with the secret in the Authorization header. */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCall(env.CRON_SECRET, request.headers.get("authorization"))) {
    return new Response(null, { status: 401 });
  }
  const report = await runDailyOperations(dailyOperations, { db, now: currentInstant() }, logger);
  return Response.json(report, { status: report.failed.length === 0 ? 200 : 500 });
}
