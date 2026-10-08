import { and, count, desc, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { staffAuditLog } from "@/lib/db/schema/audit";
import { contains } from "@/lib/db/search";
import { timeZone } from "@/lib/i18n/locales";
import { type PageWindow, pageWindow } from "@/lib/list-params";
import { type AdminViewer, assertAdmin } from "./guard";

/* The trail of what staff and admins wrote, read-only. */

export type AuditRow = typeof staffAuditLog.$inferSelect;

/** `from` and `to` are calendar days (`YYYY-MM-DD`) in the product's time zone, both included. */
export type AuditQuery = { actor: string; from: string | null; to: string | null; page: number };

export async function queryAudit(
  db: Database,
  viewer: AdminViewer,
  { actor, from, to, page }: AuditQuery,
): Promise<{ rows: AuditRow[]; window: PageWindow }> {
  assertAdmin(viewer);
  const term = actor.trim();
  const day = sql`(${staffAuditLog.createdAt} at time zone ${timeZone})::date`;
  const where = and(
    term === "" ? undefined : contains(staffAuditLog.actorEmail, term),
    from === null ? undefined : sql`${day} >= ${from}::date`,
    to === null ? undefined : sql`${day} <= ${to}::date`,
  );
  const [{ total = 0 } = {}] = await db.select({ total: count() }).from(staffAuditLog).where(where);
  const window = pageWindow(page, total);
  const rows = await db
    .select()
    .from(staffAuditLog)
    .where(where)
    .orderBy(desc(staffAuditLog.createdAt), desc(staffAuditLog.id))
    .limit(window.to === 0 ? 1 : window.to - window.from + 1)
    .offset(window.offset);
  return { rows: window.total === 0 ? [] : rows, window };
}
