/*
 * Calendar arithmetic on dates written `YYYY-MM-DD`, with no clock and no time zone: a date picker
 * moves between days, weeks and months, and draws a month as weeks. Every function takes a valid
 * date and returns one, so a screen never holds a day that does not exist.
 */

const DAY_MS = 86_400_000;
const WEEK = 7;
const iso = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number, width: number) => String(value).padStart(width, "0");
const fromUtc = (ms: number) => {
  const date = new Date(ms);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
};
const toUtc = (value: string) => {
  const [, year = "", month = "", day = ""] = iso.exec(value) ?? [];
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
};

/** True for a date that is written as `YYYY-MM-DD` and exists, such as 2024-02-29 but not 2023-02-29. */
export function isIsoDate(value: string): boolean {
  return iso.test(value) && fromUtc(toUtc(value)) === value;
}

/** 0 for Sunday up to 6 for Saturday. */
export function weekdayOf(value: string): number {
  return new Date(toUtc(value)).getUTCDay();
}

export function addDays(value: string, days: number): string {
  return fromUtc(toUtc(value) + days * DAY_MS);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Moves by whole months and keeps the day when the month has it, else lands on the last day. */
export function addMonths(value: string, months: number): string {
  const [, year = "", month = "", day = ""] = iso.exec(value) ?? [];
  const index = Number(year) * 12 + (Number(month) - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const targetDay = Math.min(Number(day), daysInMonth(targetYear, targetMonth));
  return `${pad(targetYear, 4)}-${pad(targetMonth, 2)}-${pad(targetDay, 2)}`;
}

/** The first day of the month a date is in. */
export function startOfMonth(value: string): string {
  return `${value.slice(0, 8)}01`;
}

/** The first day of the week a date is in, for a week that starts on `weekStart` (0 is Sunday). */
export function startOfWeek(value: string, weekStart: number): string {
  return addDays(value, -((weekdayOf(value) - weekStart + WEEK) % WEEK));
}

/**
 * The weeks that cover the month of a date, each seven days from `weekStart`, with the days of the
 * neighboring months that fill the first and last row. Always whole weeks, four to six of them.
 */
export function monthWeeks(value: string, weekStart: number): string[][] {
  const first = startOfMonth(value);
  const last = addDays(addMonths(first, 1), -1);
  const weeks: string[][] = [];
  for (let day = startOfWeek(first, weekStart); day <= last; day = addDays(day, WEEK)) {
    weeks.push(Array.from({ length: WEEK }, (_, offset) => addDays(day, offset)));
  }
  return weeks;
}

/** Keeps a date inside an optional range. Dates compare as text, which is their order. */
export function clampDate(value: string, min?: string, max?: string): string {
  if (min !== undefined && value < min) {
    return min;
  }
  if (max !== undefined && value > max) {
    return max;
  }
  return value;
}
