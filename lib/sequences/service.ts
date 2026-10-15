import { and, eq, sql } from "drizzle-orm";
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

/** The number last handed out in a series, or 0 when none was. */
export async function lastNumber(
  executor: Executor,
  ownerId: string,
  series: string,
): Promise<number> {
  const [row] = await executor
    .select({ lastValue: numberSequences.lastValue })
    .from(numberSequences)
    .where(and(eq(numberSequences.ownerId, ownerId), eq(numberSequences.series, series)));
  return row?.lastValue ?? 0;
}

/**
 * Makes the next number of a series `next`, to go on from numbers handed out somewhere else. It only
 * moves forward: a number at or below one already handed out would repeat it, so it returns false.
 */
export async function setNextNumber(
  executor: Executor,
  ownerId: string,
  { series, next }: { series: string; next: number },
): Promise<boolean> {
  if (!(isValidSeries(series) && Number.isSafeInteger(next) && next >= 1)) {
    throw new RangeError("A series and a next number of at least 1 are needed");
  }
  const last = next - 1;
  const rows = await executor
    .insert(numberSequences)
    .values({ ownerId, series, lastValue: last })
    .onConflictDoUpdate({
      target: [numberSequences.ownerId, numberSequences.series],
      set: { lastValue: last, updatedAt: sql`now()` },
      setWhere: sql`${numberSequences.lastValue} <= ${last}`,
    })
    .returning({ lastValue: numberSequences.lastValue });
  return rows.length > 0;
}
