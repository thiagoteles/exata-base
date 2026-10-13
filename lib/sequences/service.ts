import { sql } from "drizzle-orm";
import { isValidSeries } from "@/domain/sequences/number";
import type { Executor } from "@/lib/db/database";
import { numberSequences } from "@/lib/db/schema/number-sequences";

/**
 * The next number of a person's series, starting at 1. Call it inside the transaction that uses
 * the number: the row stays locked until that transaction ends, so concurrent callers take turns
 * and a refused transaction leaves no gap. Called with a bare database, each call is its own
 * transaction, and a number taken is then never given back.
 */
export async function nextNumber(
  executor: Executor,
  ownerId: string,
  series: string,
): Promise<number> {
  if (!isValidSeries(series)) {
    throw new RangeError(`A series is capital letters, digits and hyphens, received "${series}"`);
  }
  const [row] = await executor
    .insert(numberSequences)
    .values({ ownerId, series, lastValue: 1 })
    .onConflictDoUpdate({
      target: [numberSequences.ownerId, numberSequences.series],
      set: { lastValue: sql`${numberSequences.lastValue} + 1`, updatedAt: sql`now()` },
    })
    .returning({ lastValue: numberSequences.lastValue });
  if (row === undefined) {
    throw new Error("The database did not return the number it took");
  }
  return row.lastValue;
}
