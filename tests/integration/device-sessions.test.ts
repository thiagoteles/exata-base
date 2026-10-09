import { describe, expect, it } from "vitest";
import { sessions } from "@/lib/db/schema/auth";
import {
  endDeviceSession,
  endOtherDeviceSessions,
  listDeviceSessions,
} from "@/lib/sessions/service";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
const now = new Date();
const DAY = 86_400_000;
const chromeMac =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";

async function open(userId: string, token: string, extra: { agent?: string; days?: number } = {}) {
  const [row] = await db
    .insert(sessions)
    .values({
      userId,
      token,
      userAgent: extra.agent ?? null,
      expiresAt: new Date(now.getTime() + (extra.days ?? 1) * DAY),
    })
    .returning({ id: sessions.id });
  if (row === undefined) {
    throw new Error("session was not created");
  }
  return row.id;
}

describe("the devices a person is signed in on", () => {
  it("lists the valid sessions with what a person recognises and marks the current one", async () => {
    const ana = await createUser(db, "ana@example.com");
    const here = await open(ana.id, "t-here", { agent: chromeMac });
    await open(ana.id, "t-old", { days: -1 });
    await open(ana.id, "t-other");
    const list = await listDeviceSessions(db, ana.id, here, now);
    expect(list).toHaveLength(2);
    expect(list.find((device) => device.current)).toMatchObject({
      id: here,
      browser: "Chrome",
      system: "macOS",
    });
    expect(list.find((device) => !device.current)).toMatchObject({
      browser: null,
      system: null,
    });
  });

  it("never lists or touches another person's sessions", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    const anas = await open(ana.id, "t-a");
    const bias = await open(bia.id, "t-b");
    expect(await listDeviceSessions(db, ana.id, anas, now)).toHaveLength(1);
    expect(await endDeviceSession(db, ana.id, bias, anas)).toBe(false);
    expect(await listDeviceSessions(db, bia.id, bias, now)).toHaveLength(1);
  });

  it("ends another device, and refuses to end the one in use", async () => {
    const ana = await createUser(db, "ana@example.com");
    const here = await open(ana.id, "t-1");
    const other = await open(ana.id, "t-2");
    expect(await endDeviceSession(db, ana.id, here, here)).toBe(false);
    expect(await endDeviceSession(db, ana.id, other, here)).toBe(true);
    expect(await endDeviceSession(db, ana.id, other, here)).toBe(false);
    expect(await listDeviceSessions(db, ana.id, here, now)).toHaveLength(1);
  });

  it("ends every other device at once and keeps this one", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    const here = await open(ana.id, "t-1");
    await open(ana.id, "t-2");
    await open(ana.id, "t-3");
    await open(bia.id, "t-4");
    expect(await endOtherDeviceSessions(db, ana.id, here)).toBe(2);
    expect(await listDeviceSessions(db, ana.id, here, now)).toHaveLength(1);
    expect(await listDeviceSessions(db, bia.id, null, now)).toHaveLength(1);
  });
});
