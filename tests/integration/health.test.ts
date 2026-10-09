import { describe, expect, it } from "vitest";
import { readHealth } from "@/lib/admin/health";
import { clerkEvents } from "@/lib/db/schema/auth";
import { paymentEvents } from "@/lib/db/schema/billing";
import { runScheduledOperations, type ScheduledOperation } from "@/lib/scheduled/run";
import { testDatabase } from "./database";
import { createUser, recordingLogger } from "./factories";

const db = testDatabase();
const now = new Date("2026-10-09T12:00:00Z");
const HOUR = 3_600_000;

const passing: ScheduledOperation = {
  name: "passing",
  cadence: "daily",
  run: () => Promise.resolve({ done: 1 }),
};
const failing: ScheduledOperation = {
  name: "failing",
  cadence: "daily",
  run: () => Promise.reject(new Error("boom")),
};

async function admin() {
  const user = await createUser(db, "admin@example.com", "admin");
  return { id: user.id, role: user.role };
}

describe("the health panel", () => {
  it("is refused to anyone but an admin", async () => {
    const staff = await createUser(db, "staff@example.com", "staff");
    await expect(readHealth(db, { id: staff.id, role: "staff" }, now)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("lists the daily job before it ever ran, then with its last run", async () => {
    const viewer = await admin();
    expect((await readHealth(db, viewer, now)).jobs).toEqual([
      { name: "daily", windowMs: 88_200_000, state: "never", run: null },
    ]);

    await runScheduledOperations("daily", [passing, failing], { db, now }, recordingLogger());
    const [daily] = (await readHealth(db, viewer, new Date(now.getTime() + HOUR))).jobs;
    expect(daily).toMatchObject({ state: "failing", run: { ranAt: now, failed: 1 } });

    // The next run overwrites the row, so the panel shows the latest one only.
    const later = new Date(now.getTime() + 2 * HOUR);
    await runScheduledOperations("daily", [passing], { db, now: later }, recordingLogger());
    const [again] = (await readHealth(db, viewer, later)).jobs;
    expect(again).toMatchObject({ state: "ok", run: { ranAt: later, failed: 0 } });
  });

  it("calls the job late once its alarm window has passed", async () => {
    const viewer = await admin();
    await runScheduledOperations("daily", [passing], { db, now }, recordingLogger());
    const [daily] = (await readHealth(db, viewer, new Date(now.getTime() + 25 * HOUR))).jobs;
    expect(daily?.state).toBe("late");
  });

  it("shows the last delivery of each webhook, or none", async () => {
    const viewer = await admin();
    expect((await readHealth(db, viewer, now)).webhooks).toEqual([
      { source: "payments", lastAt: null, lastType: null },
      { source: "accounts", lastAt: null, lastType: null },
    ]);
    await db.insert(paymentEvents).values([
      {
        id: "evt_1",
        provider: "stripe",
        type: "charge.succeeded",
        receivedAt: new Date(now.getTime() - HOUR),
      },
      { id: "evt_2", provider: "stripe", type: "invoice.paid", receivedAt: now },
    ]);
    await db.insert(clerkEvents).values({ id: "msg_1", type: "user.created", receivedAt: now });
    expect((await readHealth(db, viewer, now)).webhooks).toEqual([
      { source: "payments", lastAt: now, lastType: "invoice.paid" },
      { source: "accounts", lastAt: now, lastType: "user.created" },
    ]);
  });

  it("reads the database: it answers, its version, its size and the migrations applied", async () => {
    const { database } = await readHealth(db, await admin(), now);
    expect(database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(database.serverVersion).toMatch(/^\d+/);
    expect(database.sizeBytes).toBeGreaterThan(0);
    expect(database.migrations).toBeGreaterThanOrEqual(10);
    expect(database.lastMigrationAt).toBeInstanceOf(Date);
  });
});
