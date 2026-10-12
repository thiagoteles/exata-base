import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";
import { instant } from "../columns";

/*
 * The last run of each scheduled job, one row per job, overwritten on every run. The log keeps the
 * history; this row is what the health panel reads without a log service.
 */
export const jobRuns = pgTable(
  "job_runs",
  {
    name: text().primaryKey(),
    ranAt: instant().notNull(),
    failed: integer().notNull(),
    ms: integer().notNull(),
  },
  (table) => [check("job_runs_counts", sql`${table.failed} >= 0 and ${table.ms} >= 0`)],
);
