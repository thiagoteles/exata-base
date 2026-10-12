import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createInvite } from "@/lib/accounts/invites";
import { invites } from "@/lib/db/schema/invites";
import { jobRuns } from "@/lib/db/schema/operations";
import { INVITE_RETENTION_DAYS, purgeExpiredInvites } from "@/lib/scheduled/purge-invites";
import { runScheduledOperations, type ScheduledOperation } from "@/lib/scheduled/run";
import { testDatabase } from "./database";
import { createUser, recordingLogger } from "./factories";

const db = testDatabase();
const now = new Date("2026-06-01T12:00:00Z");
const DAY = 86_400_000;

async function inviteExpiredDaysAgo(email: string, days: number) {
  const user = await createUser(db, `by-${email}`, "admin");
  const created = await createInvite(
    db,
    { id: user.id, email: user.email },
    { email, role: "staff" },
    now,
  );
  await db
    .update(invites)
    .set({ expiresAt: new Date(now.getTime() - days * DAY) })
    .where(eq(invites.id, created.id));
  return created.id;
}

describe("the invite cleanup", () => {
  it("deletes unaccepted invites that expired more than 30 days ago, and only those", async () => {
    const old = await inviteExpiredDaysAgo("old@example.com", INVITE_RETENTION_DAYS + 1);
    const recent = await inviteExpiredDaysAgo("recent@example.com", INVITE_RETENTION_DAYS - 1);
    const accepted = await inviteExpiredDaysAgo("accepted@example.com", 90);
    await db.update(invites).set({ acceptedAt: now }).where(eq(invites.id, accepted));
    const pending = await createInvite(
      db,
      { id: (await createUser(db, "admin2@example.com", "admin")).id, email: "admin2@example.com" },
      { email: "pending@example.com", role: "staff" },
      now,
    );

    expect(await purgeExpiredInvites.run({ db, now })).toEqual({ removed: 1 });
    const left = (await db.select({ id: invites.id }).from(invites)).map((row) => row.id).sort();
    expect(left).toEqual([recent, accepted, pending.id].sort());
    expect(left).not.toContain(old);
  });

  it("deletes nothing the second time it runs", async () => {
    await inviteExpiredDaysAgo("old@example.com", 60);
    expect(await purgeExpiredInvites.run({ db, now })).toEqual({ removed: 1 });
    expect(await purgeExpiredInvites.run({ db, now })).toEqual({ removed: 0 });
  });
});

describe("running a cadence", () => {
  const ok = (
    name: string,
    cadence: ScheduledOperation["cadence"] = "daily",
  ): ScheduledOperation => ({
    name,
    cadence,
    run: () => Promise.resolve({ done: 1 }),
  });
  const broken = (name: string): ScheduledOperation => ({
    name,
    cadence: "daily",
    run: () => Promise.reject(new Error("boom")),
  });

  it("runs every operation of the cadence, reports what ran, and leaves the others alone", async () => {
    const report = await runScheduledOperations(
      "daily",
      [ok("a"), ok("b"), ok("c", "hourly")],
      { db, now },
      recordingLogger(),
    );
    expect(report.cadence).toBe("daily");
    expect(report.ran.map((entry) => entry.name)).toEqual(["a", "b"]);
    expect(report.failed).toEqual([]);
    expect(report.skipped).toEqual([]);
    expect(report.ran[0]?.result).toEqual({ done: 1 });
  });

  it("runs the hourly operations on the hourly call and records that cadence's run", async () => {
    const report = await runScheduledOperations(
      "hourly",
      [ok("a"), ok("c", "hourly")],
      { db, now },
      recordingLogger(),
    );
    expect(report.ran.map((entry) => entry.name)).toEqual(["c"]);
    const [row] = await db.select().from(jobRuns);
    expect(row).toMatchObject({ name: "hourly", failed: 0, ranAt: now });
  });

  it("ends with a heartbeat named after the cadence, even after a failure", async () => {
    const lines: { message: string; fields: unknown }[] = [];
    const logger = recordingLogger();
    logger.info = (message, fields) => {
      lines.push({ message, fields });
    };
    await runScheduledOperations("daily", [broken("first"), ok("second")], { db, now }, logger);
    expect(lines.at(-1)).toEqual({ message: "heartbeat", fields: { job: "daily", failed: 1 } });
    await runScheduledOperations("every-5-min", [], { db, now }, logger);
    expect(lines.at(-1)).toEqual({
      message: "heartbeat",
      fields: { job: "every-5-min", failed: 0 },
    });
  });

  it("goes on after a failure, reports it by name only and logs it as an error", async () => {
    const errors: string[] = [];
    const report = await runScheduledOperations(
      "daily",
      [broken("first"), ok("second")],
      { db, now },
      recordingLogger(errors),
    );
    expect(report.failed.map((entry) => entry.name)).toEqual(["first"]);
    expect(report.ran.map((entry) => entry.name)).toEqual(["second"]);
    expect(JSON.stringify(report)).not.toContain("boom");
    expect(errors).toEqual(["scheduled operation failed"]);
  });

  it("does not run an operation twice at once, and runs it again once the first run ends", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = 0;
    const slow: ScheduledOperation = {
      name: "slow",
      cadence: "hourly",
      run: async () => {
        started += 1;
        await gate;
        return { done: 1 };
      },
    };
    const first = runScheduledOperations("hourly", [slow], { db, now }, recordingLogger());
    while (started === 0) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const second = await runScheduledOperations("hourly", [slow], { db, now }, recordingLogger());
    expect(second.skipped).toEqual(["slow"]);
    expect(second.ran).toEqual([]);
    expect(second.failed).toEqual([]);
    release();
    expect((await first).ran.map((entry) => entry.name)).toEqual(["slow"]);
    expect(started).toBe(1);

    const third = await runScheduledOperations("hourly", [slow], { db, now }, recordingLogger());
    expect(third.ran.map((entry) => entry.name)).toEqual(["slow"]);
  });

  it("releases the lock when the operation fails", async () => {
    const flaky: ScheduledOperation = {
      name: "flaky",
      cadence: "hourly",
      run: () => Promise.reject(new Error("boom")),
    };
    const first = await runScheduledOperations("hourly", [flaky], { db, now }, recordingLogger());
    expect(first.failed.map((entry) => entry.name)).toEqual(["flaky"]);
    const second = await runScheduledOperations("hourly", [flaky], { db, now }, recordingLogger());
    expect(second.skipped).toEqual([]);
    expect(second.failed.map((entry) => entry.name)).toEqual(["flaky"]);
  });
});
