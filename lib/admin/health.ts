import { desc, sql } from "drizzle-orm";
import { type JobRun, type JobState, jobState, windowMs } from "@/domain/operations/job-health";
import type { Database } from "@/lib/db/database";
import { clerkEvents } from "@/lib/db/schema/auth";
import { paymentEvents } from "@/lib/db/schema/billing";
import { jobRuns } from "@/lib/db/schema/operations";
import heartbeats from "@/ops/gcp/heartbeats.json";
import { type AdminViewer, assertAdmin } from "./guard";

/*
 * What the health panel shows, from the database alone: the last run of each scheduled job against
 * the same window as its absence alarm, the last delivery of each webhook, and the database itself.
 * It answers without a log service, so it still works where Google Cloud is not set up.
 */

export type JobHealth = {
  name: string;
  windowMs: number;
  state: JobState;
  run: (JobRun & { ms: number }) | null;
};

type WebhookSource = "payments" | "accounts";

export type WebhookHealth = { source: WebhookSource; lastAt: Date | null; lastType: string | null };

type DatabaseHealth = {
  latencyMs: number;
  serverVersion: string;
  sizeBytes: number;
  migrations: number;
  lastMigrationAt: Date | null;
};

export type Health = { jobs: JobHealth[]; webhooks: WebhookHealth[]; database: DatabaseHealth };

async function readJobs(db: Database, now: Date): Promise<JobHealth[]> {
  const runs = await db.select().from(jobRuns);
  const byName = new Map(runs.map((run) => [run.name, run]));
  // Every job with an alarm is listed, even one that never ran: that is the case worth seeing.
  return heartbeats.map((job) => {
    const run = byName.get(job.job);
    const window = windowMs(job.window);
    const last = run ?? null;
    return { name: job.job, windowMs: window, state: jobState(last, window, now), run: last };
  });
}

async function lastDelivery(
  db: Database,
  table: typeof paymentEvents | typeof clerkEvents,
  source: WebhookSource,
): Promise<WebhookHealth> {
  const [last] = await db
    .select({ at: table.receivedAt, type: table.type })
    .from(table)
    .orderBy(desc(table.receivedAt))
    .limit(1);
  return { source, lastAt: last?.at ?? null, lastType: last?.type ?? null };
}

type MigrationRow = { applied: number; last: string | null };

async function readDatabase(db: Database): Promise<DatabaseHealth> {
  const started = performance.now();
  await db.execute(sql`select 1`);
  const latencyMs = Math.round(performance.now() - started);
  const [about] = await db.execute<{ version: string; size: string }>(
    sql`select current_setting('server_version') as version, pg_database_size(current_database())::text as size`,
  );
  // The migrator's own ledger; created_at there is the migration's timestamp in milliseconds.
  const [migrations] = await db.execute<MigrationRow>(
    sql`select count(*)::int as applied, max(created_at)::text as last from drizzle.__drizzle_migrations`,
  );
  return {
    latencyMs,
    serverVersion: about?.version ?? "",
    sizeBytes: Number(about?.size ?? 0),
    migrations: migrations?.applied ?? 0,
    lastMigrationAt:
      migrations === undefined || migrations.last === null
        ? null
        : new Date(Number(migrations.last)),
  };
}

export async function readHealth(db: Database, viewer: AdminViewer, now: Date): Promise<Health> {
  assertAdmin(viewer);
  const [jobs, payments, accounts, database] = await Promise.all([
    readJobs(db, now),
    lastDelivery(db, paymentEvents, "payments"),
    lastDelivery(db, clerkEvents, "accounts"),
    readDatabase(db),
  ]);
  return { jobs, webhooks: [payments, accounts], database };
}
