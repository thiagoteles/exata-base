/*
 * Axis ticks that read as round numbers. The top tick is the first step at or above the largest
 * value, and the step is 1, 2 or 5 times a power of ten, so a chart of sign-ups reads 0, 5, 10
 * and never 0, 4.3, 8.6. An all-zero series still gets an axis, from 0 to 1. A count never steps
 * by less than one: half a sign-up is not a value anyone can have.
 */

const NICE_FACTORS = [1, 2, 5, 10] as const;

export function niceTicks(
  max: number,
  { count = 4, integer = false }: { count?: number; integer?: boolean } = {},
): number[] {
  if (!(max > 0)) {
    return [0, 1];
  }
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const nice = (NICE_FACTORS.find((factor) => factor * power >= rough) ?? 10) * power;
  const step = integer ? Math.max(1, Math.round(nice)) : nice;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) =>
    Number((index * step).toPrecision(12)),
  );
}
