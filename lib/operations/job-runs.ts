import type { Database } from "@/lib/db/database";
import { jobRuns } from "@/lib/db/schema/operations";

export type JobRunRecord = { name: string; ranAt: Date; failed: number; ms: number };

/** Keeps the latest run of a job. A product's own scheduled sync records here too. */
export async function recordJobRun(db: Database, run: JobRunRecord): Promise<void> {
  await db
    .insert(jobRuns)
    .values(run)
    .onConflictDoUpdate({
      target: jobRuns.name,
      set: { ranAt: run.ranAt, failed: run.failed, ms: run.ms },
    });
}
