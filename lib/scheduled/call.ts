import "server-only";
import { currentInstant } from "@/domain/clock";
import type { Cadence } from "@/domain/operations/cadence";
import { db } from "@/lib/db/client";
import { logger } from "@/lib/ports/log";
import { scheduledOperations } from "./registry";
import { runScheduledOperations } from "./run";

/** What a route answers once the call is authorized: the report, as a failure if any operation failed. */
export async function runScheduledCall(cadence: Cadence): Promise<Response> {
  const report = await runScheduledOperations(
    cadence,
    scheduledOperations,
    { db, now: currentInstant() },
    logger,
  );
  return Response.json(report, { status: report.failed.length === 0 ? 200 : 500 });
}
