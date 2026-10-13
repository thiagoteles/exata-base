/*
 * Calendar days as `YYYY-MM-DD` text, counted without a clock. A quote belongs to a day, and the day
 * that counts is the person's, so these rules take a day in and give a day out. They know weekends;
 * holidays are the quote source's to say, since a holiday is a day with no published quote.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_PER_ERA = 146_097;
const DAYS_FROM_YEAR_ZERO_TO_EPOCH = 719_468;
const THURSDAY = 4;

function parts(day: string): { year: number; month: number; date: number } | null {
  const match = ISO_DAY.exec(day);
  if (match === null) {
    return null;
  }
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return { year, month, date };
}

/** Whether the text is a real calendar day, such as `2026-10-09` and not `2026-02-30`. */
export function isIsoDay(day: string): boolean {
  const found = parts(day);
  return found !== null && fromDayNumber(toDayNumber(day)) === day;
}

/** Days since 1970-01-01, by the proleptic Gregorian calendar. */
export function toDayNumber(day: string): number {
  const found = parts(day);
  if (found === null) {
    throw new RangeError(`A day is written YYYY-MM-DD, received "${day}"`);
  }
  const year = found.month <= 2 ? found.year - 1 : found.year;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const shiftedMonth = found.month + (found.month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + found.date - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * DAYS_PER_ERA + dayOfEra - DAYS_FROM_YEAR_ZERO_TO_EPOCH;
}

export function fromDayNumber(number: number): string {
  const shifted = number + DAYS_FROM_YEAR_ZERO_TO_EPOCH;
  const era = Math.floor(shifted / DAYS_PER_ERA);
  const dayOfEra = shifted - era * DAYS_PER_ERA;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const date = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

export function addDays(day: string, count: number): string {
  return fromDayNumber(toDayNumber(day) + count);
}

/** 0 is Sunday and 6 is Saturday. */
export function weekdayOf(day: string): number {
  return (((toDayNumber(day) + THURSDAY) % 7) + 7) % 7;
}

export function isWeekend(day: string): boolean {
  const weekday = weekdayOf(day);
  return weekday === 0 || weekday === 6;
}

/** The day and the ones before it, newest first: `daysUpTo("2026-10-09", 3)` is the 9th, 8th and 7th. */
export function daysUpTo(day: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(day, -index));
}
