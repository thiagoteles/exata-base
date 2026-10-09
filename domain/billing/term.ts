/*
 * A plan bought for a fixed term, such as a year paid once by Pix or card, has no renewal: it runs
 * to a date and then it is over. These are the rules for that date, with the clock handed in.
 */

const DAY_MS = 86_400_000;

/** How many days before a term ends the person is warned. */
export const EXPIRY_WARNING_DAYS = 7;

/** The intervals that are a one-off payment for a year, as opposed to a subscription or a lifetime plan. */
export const fixedTermIntervals = ["yearly_once"] as const;

export const isFixedTerm = (interval: string | null): boolean =>
  fixedTermIntervals.some((candidate) => candidate === interval);

/** The same moment a year later. 29 February lands on 28 February of a year that has no 29th. */
export function oneYearAfter(start: Date): Date {
  const next = new Date(start.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  const daysInMonth = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(Math.min(day, daysInMonth));
  return next;
}

/** True once the term has run out. A term that ends exactly now is over. */
export const termEnded = (end: Date, now: Date): boolean => end.getTime() <= now.getTime();

/** Whether to warn now: the term ends within the warning window and has not ended yet. */
export function termEndsSoon(end: Date, now: Date, warnDays: number): boolean {
  return !termEnded(end, now) && end.getTime() - now.getTime() <= warnDays * DAY_MS;
}
