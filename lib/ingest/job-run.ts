import { isCadence } from "@/domain/operations/cadence";
import { recordJobRun } from "@/lib/operations/job-runs";
import { logger } from "@/lib/ports/log";
import { z } from "@/lib/validation";
import { SOURCE_NAME } from "./secrets";
import { ingestSource } from "./source";

const MAX_COUNT = 1_000_000;
const DAY_MS = 86_400_000;

const schema = z
  .object({
    // A job outside the server, named as the alarm for it is. The cadences are the server's own.
    job: z
      .string()
      .regex(SOURCE_NAME)
      .refine((name) => !isCadence(name)),
    failed: z.int().min(0).max(MAX_COUNT),
    ms: z.int().min(0).max(DAY_MS),
  })
  .strict();

/**
 * A worker outside the server reports that a run of its job ended. It lands in the health panel
 * and in the log as a `heartbeat`, so the absence alarm watches a job the server does not run.
 */
export const jobRunSource = ingestSource(schema, async ({ db, payload, now }) => {
  await recordJobRun(db, { name: payload.job, ranAt: now, failed: payload.failed, ms: payload.ms });
  logger.info("heartbeat", { job: payload.job, failed: payload.failed });
  return { recorded: 1 };
});
