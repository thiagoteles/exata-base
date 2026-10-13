/*
 * Converting an amount at a quote, exactly. A quote is a decimal text such as `5.4321` (reais per
 * unit of the foreign currency) and the arithmetic is on whole numbers, so no float decides a cent.
 * The result is rounded once, half away from zero, to the minor unit of the currency it lands in.
 */

import { type CurrencyCode, exponentOf } from "../money/currency";
import { type Money, money } from "../money/money";

export type DecimalRate = { digits: bigint; scale: number };

const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

/** `5.4321` is 54321 with scale 4. Null for anything that is not a positive decimal. */
export function parseRate(text: string): DecimalRate | null {
  const match = DECIMAL.exec(text.trim());
  const whole = match?.[1];
  if (match === null || whole === undefined) {
    return null;
  }
  const fraction = match[2] ?? "";
  const digits = BigInt(`${whole}${fraction}`);
  return digits > 0n ? { digits, scale: fraction.length } : null;
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const quotient = absolute / denominator;
  const rounded = (absolute % denominator) * 2n >= denominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

/** `amount` in its currency, expressed in `to` at `rate` units of `to` per unit of the amount's currency. */
export function convert(amount: Money, rate: DecimalRate, to: CurrencyCode): Money {
  const shift = exponentOf(to) - exponentOf(amount.currency);
  const up = shift > 0 ? 10n ** BigInt(shift) : 1n;
  const down = shift < 0 ? 10n ** BigInt(-shift) : 1n;
  const numerator = BigInt(amount.minor) * rate.digits * up;
  const denominator = 10n ** BigInt(rate.scale) * down;
  const converted = divideRounded(numerator, denominator);
  if (converted > BigInt(Number.MAX_SAFE_INTEGER) || converted < BigInt(-Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("The converted amount is outside the safe range");
  }
  return money(Number(converted), to);
}
