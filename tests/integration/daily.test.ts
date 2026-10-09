import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createInvite } from "@/lib/accounts/invites";
import { INVITE_RETENTION_DAYS, purgeExpiredInvites } from "@/lib/daily/purge-invites";
import { type DailyOperation, runDailyOperations } from "@/lib/daily/run";
import { invites } from "@/lib/db/schema/invites";
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

describe("running the registry", () => {
  const ok = (name: string): DailyOperation => ({ name, run: () => Promise.resolve({ done: 1 }) });
  const broken = (name: string): DailyOperation => ({
    name,
    run: () => Promise.reject(new Error("boom")),
  });

  it("runs every operation, reports what ran, and logs start and end", async () => {
    const logger = recordingLogger();
    const report = await runDailyOperations([ok("a"), ok("b")], { db, now }, logger);
    expect(report.ran.map((entry) => entry.name)).toEqual(["a", "b"]);
    expect(report.failed).toEqual([]);
    expect(report.ran[0]?.result).toEqual({ done: 1 });
  });

  it("ends with a heartbeat, even after a failure, which the absence alarm watches", async () => {
    const lines: { message: string; fields: unknown }[] = [];
    const logger = recordingLogger();
    logger.info = (message, fields) => {
      lines.push({ message, fields });
    };
    await runDailyOperations([broken("first"), ok("second")], { db, now }, logger);
    expect(lines.at(-1)).toEqual({ message: "heartbeat", fields: { job: "daily", failed: 1 } });
  });

  it("goes on after a failure, reports it by name only and logs it as an error", async () => {
    const errors: string[] = [];
    const report = await runDailyOperations(
      [broken("first"), ok("second")],
      { db, now },
      recordingLogger(errors),
    );
    expect(report.failed.map((entry) => entry.name)).toEqual(["first"]);
    expect(report.ran.map((entry) => entry.name)).toEqual(["second"]);
    expect(JSON.stringify(report)).not.toContain("boom");
    expect(errors).toEqual(["daily operation failed"]);
  });
});
