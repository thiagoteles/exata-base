import { getFormatter, getTranslations } from "next-intl/server";
import { type Column, DataList } from "@/components/patterns/data-list";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Stamp, type StampTone } from "@/components/ui/stamp";
import type { JobState } from "@/domain/operations/job-health";
import type { Health, JobHealth, WebhookHealth } from "@/lib/admin/health";

const stateTone: Record<JobState, StampTone> = {
  ok: "success",
  failing: "danger",
  late: "warning",
  never: "neutral",
};

const stamp = { dateStyle: "short", timeStyle: "short" } as const;
const HOUR_MS = 3_600_000;
const MEGABYTE = 1_048_576;
// A commit reads best at the length Git itself shortens it to in a log.
const COMMIT_LENGTH = 12;

type Release = { service: string; commit: string | null };

/** What is running, then the scheduled jobs, then the webhooks: the order an outage is chased in. */
export async function HealthBoard({
  health,
  now,
  release,
}: {
  health: Health;
  now: Date;
  release: Release;
}) {
  const [t, format] = await Promise.all([getTranslations("admin.health"), getFormatter()]);
  const when = (instant: Date) => (
    <time dateTime={instant.toISOString()} title={format.dateTime(instant, stamp)}>
      {format.relativeTime(instant, now)}
    </time>
  );
  const { database } = health;
  // A quick job reads in milliseconds; "0 s" would say it did not run.
  const duration = (ms: number) =>
    ms < 1000
      ? format.number(ms, { style: "unit", unit: "millisecond" })
      : format.number(ms / 1000, { style: "unit", unit: "second", maximumFractionDigits: 1 });

  const jobColumns: Column<JobHealth>[] = [
    {
      key: "job",
      header: t("job"),
      kind: "title",
      width: "1.4fr",
      cell: (job) => <span className="font-mono">{job.name}</span>,
    },
    {
      key: "state",
      header: t("state"),
      kind: "status",
      cell: (job) => <Stamp tone={stateTone[job.state]}>{t(`states.${job.state}`)}</Stamp>,
    },
    {
      key: "lastRun",
      header: t("lastRun"),
      width: "1.6fr",
      cell: (job) =>
        job.run === null ? (
          <span className="text-ink-muted">{t("neverRan")}</span>
        ) : (
          <span className="flex flex-col">
            {when(job.run.ranAt)}
            {job.run.failed > 0 ? (
              <span className="text-body-small text-danger-ink">
                {t("failures", { count: job.run.failed })}
              </span>
            ) : null}
          </span>
        ),
    },
    {
      key: "duration",
      header: t("duration"),
      numeric: true,
      cell: (job) => (job.run === null ? "" : duration(job.run.ms)),
    },
    {
      key: "window",
      header: t("window"),
      numeric: true,
      cell: (job) => t("windowHours", { hours: Math.round((job.windowMs / HOUR_MS) * 10) / 10 }),
    },
  ];

  const webhookColumns: Column<WebhookHealth>[] = [
    {
      key: "source",
      header: t("source"),
      kind: "title",
      width: "1.4fr",
      cell: (hook) => t(`sources.${hook.source}`),
    },
    {
      key: "lastDelivery",
      header: t("lastDelivery"),
      width: "1.6fr",
      cell: (hook) =>
        hook.lastAt === null ? (
          <span className="text-ink-muted">{t("noDelivery")}</span>
        ) : (
          when(hook.lastAt)
        ),
    },
    {
      key: "lastType",
      header: t("lastType"),
      numeric: true,
      width: "2fr",
      cell: (hook) => hook.lastType ?? "",
    },
  ];

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <h2 className="text-section text-ink">{t("release")}</h2>
        <RecordGrid aria-label={t("release")} className="md:grid-cols-2 xl:grid-cols-4">
          <RecordCell label={t("version")} wide>
            {release.commit === null ? (
              <span className="text-ink-muted">{t("unknownVersion")}</span>
            ) : (
              <span className="font-mono text-data tabular-nums">
                {release.commit.slice(0, COMMIT_LENGTH)}
              </span>
            )}
            <span className="mt-1 block text-body-small text-ink-muted">
              {t("service")} <span className="font-mono">{release.service}</span>
            </span>
          </RecordCell>
          <RecordCell
            label={t("database")}
            stamp={<Stamp tone="success">{t("databaseUp")}</Stamp>}
            wide
          >
            {t("answered", { ms: database.latencyMs })}
          </RecordCell>
          <RecordCell label={t("postgres")}>
            <span className="font-mono text-data tabular-nums">{database.serverVersion}</span>
          </RecordCell>
          <RecordCell label={t("size")}>
            <span className="font-mono text-data tabular-nums">
              {format.number(database.sizeBytes / MEGABYTE, {
                style: "unit",
                unit: "megabyte",
                maximumFractionDigits: 1,
              })}
            </span>
          </RecordCell>
          <RecordCell label={t("migrations")} wide>
            {t("migrationsApplied", { count: database.migrations })}
            {database.lastMigrationAt === null ? null : (
              <span className="mt-1 block text-body-small text-ink-muted">
                {t("lastMigration", { date: format.dateTime(database.lastMigrationAt, stamp) })}
              </span>
            )}
          </RecordCell>
        </RecordGrid>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-section text-ink">{t("jobs")}</h2>
          <p className="max-w-[60ch] text-body-small text-ink-muted">{t("jobsNote")}</p>
        </div>
        <DataList
          label={t("jobs")}
          columns={jobColumns}
          rows={health.jobs}
          getKey={(job) => job.name}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-section text-ink">{t("webhooks")}</h2>
          <p className="max-w-[60ch] text-body-small text-ink-muted">{t("webhooksNote")}</p>
        </div>
        <DataList
          label={t("webhooks")}
          columns={webhookColumns}
          rows={health.webhooks}
          getKey={(hook) => hook.source}
        />
      </section>
    </div>
  );
}
