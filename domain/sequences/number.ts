/*
 * A numbered series: a prefix and a counter that only goes up, written as `INV-0008`. The counter is
 * kept by the database inside the transaction that uses the number, so a number is never reused and
 * a refused transaction gives its number back. Here lives only the shape of the text.
 */

// Capitals and digits in groups joined by single hyphens, starting with a letter: `INV`, `INV-B`.
// No leading, trailing or doubled hyphen, so the last hyphen of `INV-0008` always splits it.
const SERIES_SHAPE = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*$/;
const MAX_SERIES_CHARACTERS = 16;
const ONLY_DIGITS = /^\d+$/;
const MIN_WIDTH = 1;
const DEFAULT_WIDTH = 4;

export function isValidSeries(series: string): boolean {
  return series.length <= MAX_SERIES_CHARACTERS && SERIES_SHAPE.test(series);
}

/** `INV` and 8 are `INV-0008`; a number wider than the padding keeps all its digits. */
export function formatSeriesNumber(series: string, value: number, width = DEFAULT_WIDTH): string {
  if (!isValidSeries(series)) {
    throw new RangeError(`A series is capital letters, digits and hyphens, received "${series}"`);
  }
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`A series number is a positive whole number, received ${value}`);
  }
  return `${series}-${String(value).padStart(Math.max(MIN_WIDTH, width), "0")}`;
}

/** The series and the number of `INV-0008`, or null for anything that is not one. */
export function parseSeriesNumber(text: string): { series: string; value: number } | null {
  const hyphen = text.lastIndexOf("-");
  if (hyphen < 1) {
    return null;
  }
  const series = text.slice(0, hyphen);
  const digits = text.slice(hyphen + 1);
  if (!(isValidSeries(series) && ONLY_DIGITS.test(digits))) {
    return null;
  }
  const value = Number(digits);
  return Number.isSafeInteger(value) && value >= 1 ? { series, value } : null;
}
