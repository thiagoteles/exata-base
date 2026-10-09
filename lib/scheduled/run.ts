import type { Cadence } from "@/domain/operations/cadence";
import type { Database } from "@/lib/db/database";
import { recordJobRun } from "@/lib/operations/job-runs";
import type { Logger } from "@/lib/ports/log/types";
import { withOperationLock } from "./lock";

/*
 * The scheduled operations. The host calls one address per cadence and every operation that
 * declared that cadence runs, one after the other. An operation is idempotent: running a cadence
 * twice in a row changes nothing the second time, so a manual run is always safe.
 */

export type ScheduledContext = { db: Database; now: Date };

export type ScheduledOperation = {
  name: string;
  cadence: Cadence;
  run: (context: ScheduledContext) => Promise<Record<string, number>>;
};

export type ScheduledReport = {
  cadence: Cadence;
  ran: { name: string; ms: number; result: Record<string, number> }[];
  failed: { name: string; ms: number }[];
  /** Operations whose previous run had not finished, so this call left them alone. */
  skipped: string[];
  ms: number;
};

/** Runs the operations of one cadence. One failing is logged and reported and does not stop the others. */
export async function runScheduledOperations(
  cadence: Cadence,
  operations: readonly ScheduledOperation[],
  context: ScheduledContext,
  logger: Logger,
): Promise<ScheduledReport> {
  const started = performance.now();
  const report: ScheduledReport = { cadence, ran: [], failed: [], skipped: [], ms: 0 };
  for (const operation of operations.filter((entry) => entry.cadence === cadence)) {
    // One after the other on purpose: operations may touch the same rows, and the log reads in order.
    const begin = performance.now();
    const elapsed = () => Math.round(performance.now() - begin);
    try {
      // biome-ignore lint/performance/noAwaitInLoops: operations run in order, not at once
      const outcome = await withOperationLock(context.db, operation.name, async () => {
        logger.info("scheduled operation started", { operation: operation.name, cadence });
        return await operation.run(context);
      });
      if (outcome.ran) {
        logger.info("scheduled operation finished", {
          operation: operation.name,
          ms: elapsed(),
          result: outcome.value,
        });
        report.ran.push({ name: operation.name, ms: elapsed(), result: outcome.value });
      } else {
        logger.warn("scheduled operation skipped: the previous run has not finished", {
          operation: operation.name,
          cadence,
        });
        report.skipped.push(operation.name);
      }
    } catch (error) {
      logger.error("scheduled operation failed", {
        operation: operation.name,
        ms: elapsed(),
        error,
      });
      report.failed.push({ name: operation.name, ms: elapsed() });
    }
  }
  report.ms = Math.round(performance.now() - started);
  try {
    await recordJobRun(context.db, {
      name: cadence,
      ranAt: context.now,
      failed: report.failed.length,
      ms: report.ms,
    });
  } catch (error) {
    // The run itself happened; only the panel's row is missing, and the heartbeat below still goes.
    logger.error("scheduled run not recorded", { error, cadence });
  }
  // The absence alarm of each cadence watches this line: if it stops, the host stopped calling,
  // which no error would ever say. Failures are errors of their own, above.
  logger.info("heartbeat", { job: cadence, failed: report.failed.length });
  return report;
}
