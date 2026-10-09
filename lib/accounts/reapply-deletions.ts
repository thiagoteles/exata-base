import type { Database } from "@/lib/db/database";
import { type DeletionSteps, deleteAccount } from "./delete";

/*
 * After a backup is restored, accounts deleted since the backup was taken are back in the database.
 * Their former ids come from the deletion trail of the database that failed, or from the "account
 * deleted" lines of the log, and each is deleted again, with a new trail entry saying it was the
 * restore. An id that is not there (never restored, or already gone) is counted and skipped.
 */
export async function reapplyDeletions(
  db: Database,
  steps: DeletionSteps,
  formerUserIds: readonly string[],
): Promise<{ deleted: number; absent: number }> {
  let deleted = 0;
  for (const userId of new Set(formerUserIds)) {
    // biome-ignore lint/performance/noAwaitInLoops: one account at a time, so a failure names its id
    const removed = await deleteAccount(db, steps, {
      userId,
      requestedBy: "admin",
      requestedByEmail: "restore",
    });
    deleted += removed ? 1 : 0;
  }
  return { deleted, absent: new Set(formerUserIds).size - deleted };
}
