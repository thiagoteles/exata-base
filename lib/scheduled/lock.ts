import type { Database } from "@/lib/db/database";

/*
 * One run of an operation at a time, across every instance of the app. The lock is an advisory
 * lock held by a connection reserved for the length of the run, so the operation itself keeps using
 * the normal pool and its own transactions. If the previous run is still going, the call does not
 * wait and does not run: the next call of the cadence will find it done.
 */

type Locked<T> = { ran: true; value: T } | { ran: false };

export async function withOperationLock<T>(
  db: Database,
  name: string,
  run: () => Promise<T>,
): Promise<Locked<T>> {
  const connection = await db.$client.reserve();
  try {
    const [row] = await connection<{ locked: boolean }[]>`
      select pg_try_advisory_lock(hashtext('scheduled'), hashtext(${name})) as locked`;
    if (row?.locked !== true) {
      return { ran: false };
    }
    try {
      return { ran: true, value: await run() };
    } finally {
      await connection`select pg_advisory_unlock(hashtext('scheduled'), hashtext(${name}))`;
    }
  } finally {
    connection.release();
  }
}
