import { and, asc, desc, eq, gt, ne } from "drizzle-orm";
import { describeDevice } from "@/domain/sessions/device";
import type { Database } from "@/lib/db/database";
import { sessions } from "@/lib/db/schema/auth";

/*
 * The signed-in devices of one person in local mode, read straight from the sessions table the auth
 * library keeps. The token never leaves this module: a screen sees an id and what to show about it.
 */

export type DeviceSession = {
  id: string;
  browser: string | null;
  system: string | null;
  ipAddress: string | null;
  createdAt: Date;
  current: boolean;
};

/** Sessions that are still valid, newest first, with the one in this browser marked. */
export async function listDeviceSessions(
  db: Database,
  userId: string,
  currentId: string | null,
  now: Date,
): Promise<DeviceSession[]> {
  const rows = await db
    .select({
      id: sessions.id,
      userAgent: sessions.userAgent,
      ipAddress: sessions.ipAddress,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, now)))
    .orderBy(desc(sessions.createdAt), asc(sessions.id));
  return rows.map((row) => ({
    id: row.id,
    ...describeDevice(row.userAgent),
    ipAddress: row.ipAddress,
    createdAt: row.createdAt,
    current: row.id === currentId,
  }));
}

/** Ends one of the person's other sessions. False when it is not theirs or is the current one. */
export async function endDeviceSession(
  db: Database,
  userId: string,
  id: string,
  currentId: string | null,
): Promise<boolean> {
  if (id === currentId) {
    return false;
  }
  const removed = await db
    .delete(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
    .returning({ id: sessions.id });
  return removed.length > 0;
}

/** Ends every session of the person except the one in this browser; returns how many ended. */
export async function endOtherDeviceSessions(
  db: Database,
  userId: string,
  currentId: string,
): Promise<number> {
  const removed = await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentId)))
    .returning({ id: sessions.id });
  return removed.length;
}
