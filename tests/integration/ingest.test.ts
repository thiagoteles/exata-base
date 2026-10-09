import { describe, expect, it } from "vitest";
import { readHealth } from "@/lib/admin/health";
import { jobRuns } from "@/lib/db/schema/operations";
import { DomainError } from "@/lib/errors";
import { handleIngest } from "@/lib/ingest/handle";
import { ingestSources } from "@/lib/ingest/sources";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const secret = "w".repeat(32);
const now = new Date("2026-10-09T12:00:00Z");

const deliver = (body: unknown) =>
  handleIngest(
    {
      db,
      sources: ingestSources,
      secrets: { "job-run": secret },
      now,
      enforceLimit: () => Promise.resolve(),
    },
    {
      source: "job-run",
      authorization: `Bearer ${secret}`,
      contentLength: null,
      readBody: () => Promise.resolve(JSON.stringify(body)),
    },
  );

const status = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 200;
  } catch (error) {
    return error instanceof DomainError ? error.status : 500;
  }
};

describe("the job-run source", () => {
  it("records the run of a job outside the server, once per job, the latest winning", async () => {
    expect(await deliver({ job: "price-collector", failed: 0, ms: 4200 })).toEqual({ recorded: 1 });
    const later = { job: "price-collector", failed: 2, ms: 900 };
    await deliver(later);
    await deliver({ job: "other-worker", failed: 0, ms: 10 });
    const rows = await db.select().from(jobRuns);
    expect(rows.map((row) => row.name).sort()).toEqual(["other-worker", "price-collector"]);
    expect(rows.find((row) => row.name === "price-collector")).toMatchObject({
      failed: 2,
      ms: 900,
      ranAt: now,
    });
  });

  it("refuses a job that takes the name of a cadence, a bad name and numbers out of range", async () => {
    expect(await status(deliver({ job: "daily", failed: 0, ms: 1 }))).toBe(400);
    expect(await status(deliver({ job: "every-5-min", failed: 0, ms: 1 }))).toBe(400);
    expect(await status(deliver({ job: "Bad Name", failed: 0, ms: 1 }))).toBe(400);
    expect(await status(deliver({ job: "ok", failed: -1, ms: 1 }))).toBe(400);
    expect(await status(deliver({ job: "ok", failed: 0, ms: 1.5 }))).toBe(400);
    expect(await status(deliver({ job: "ok", failed: 0, ms: 86_400_001 }))).toBe(400);
    expect(await db.select().from(jobRuns)).toEqual([]);
  });

  it("shows up in the health panel once the job has its alarm line", async () => {
    // The panel lists the jobs that have an alarm; this one has none in the base, so it is stored
    // for the day a product adds its line, and the panel's own list is unchanged.
    await deliver({ job: "price-collector", failed: 0, ms: 5 });
    const admin = await createUser(db, "admin@example.com", "admin");
    const { jobs } = await readHealth(db, { id: admin.id, role: admin.role }, now);
    expect(jobs.map((job) => job.name)).toEqual(["daily"]);
  });
});
