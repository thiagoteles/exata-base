import type { Database } from "@/lib/db/database";
import { recordJobRun } from "@/lib/operations/job-runs";
import type { Logger } from "@/lib/ports/log/types";

/*
 * The daily operations. The scheduler calls one endpoint once a day and every operation in the
 * registry runs, one after the other. An operation is idempotent: running the whole set twice on
 * the same day changes nothing the second time, so a manual run is always safe.
 */

export type DailyContext = { db: Database; now: Date };

export type DailyOperation = {
  name: string;
  run: (context: DailyContext) => Promise<Record<string, number>>;
};

export type DailyReport = {
  ran: { name: string; ms: number; result: Record<string, number> }[];
  failed: { name: string; ms: number }[];
  ms: number;
};

/** Runs every operation. One failing is logged and reported and does not stop the others. */
export async function runDailyOperations(
  operations: readonly DailyOperation[],
  context: DailyContext,
  logger: Logger,
): Promise<DailyReport> {
  const started = performance.now();
  const report: DailyReport = { ran: [], failed: [], ms: 0 };
  for (const operation of operations) {
    // One after the other on purpose: operations may touch the same rows, and the log reads in order.
    const begin = performance.now();
    logger.info("daily operation started", { operation: operation.name });
    try {
      // biome-ignore lint/performance/noAwaitInLoops: operations run in order, not at once
      const result = await operation.run(context);
      const ms = Math.round(performance.now() - begin);
      logger.info("daily operation finished", { operation: operation.name, ms, result });
      report.ran.push({ name: operation.name, ms, result });
    } catch (error) {
      const ms = Math.round(performance.now() - begin);
      logger.error("daily operation failed", { operation: operation.name, ms, error });
      report.failed.push({ name: operation.name, ms });
    }
  }
  report.ms = Math.round(performance.now() - started);
  try {
    await recordJobRun(context.db, {
      name: "daily",
      ranAt: context.now,
      failed: report.failed.length,
      ms: report.ms,
    });
  } catch (error) {
    // The run itself happened; only the panel's row is missing, and the heartbeat below still goes.
    logger.error("daily run not recorded", { error });
  }
  // The absence alarm watches this line: if it stops, the scheduler stopped calling, which no error
  // would ever say. Failures are errors of their own, above.
  logger.info("heartbeat", { job: "daily", failed: report.failed.length });
  return report;
}
