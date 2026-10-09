import { and, isNull, lt } from "drizzle-orm";
import { invites } from "@/lib/db/schema/invites";
import type { ScheduledOperation } from "./run";

const DAY_MS = 86_400_000;
export const INVITE_RETENTION_DAYS = 30;

/**
 * Deletes invites that were never accepted and expired more than 30 days ago, so their token hash
 * is not kept for good. Running it twice in a row deletes nothing the second time.
 */
export const purgeExpiredInvites: ScheduledOperation = {
  cadence: "daily",
  name: "purge-expired-invites",
  async run({ db, now }) {
    const cutoff = new Date(now.getTime() - INVITE_RETENTION_DAYS * DAY_MS);
    const removed = await db
      .delete(invites)
      .where(and(isNull(invites.acceptedAt), lt(invites.expiresAt, cutoff)))
      .returning({ id: invites.id });
    return { removed: removed.length };
  },
};
