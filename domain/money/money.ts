/*
 * An amount of money: a whole number of minor units and the currency they are in. Amounts of
 * different currencies are never added or compared, and the minor unit of each currency comes from
 * its exponent, so JPY has no hundredths and KWD has thousandths. Nothing here reads the clock or
 * converts between currencies: a conversion is a quote the caller supplies and keeps.
 */

import type { CurrencyCode } from "./currency";

export type Money = { readonly minor: number; readonly currency: CurrencyCode };

export function money(minor: number, currency: CurrencyCode): Money {
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError(`Minor units must be a safe integer, received ${minor}`);
  }
  return { minor, currency };
}

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new RangeError(`Cannot combine ${a.currency} with ${b.currency} without a conversion`);
  }
}

export function add(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return money(a.minor + b.minor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return money(a.minor - b.minor, a.currency);
}

export function negate(a: Money): Money {
  return money(a.minor === 0 ? 0 : -a.minor, a.currency);
}

export function isZero(a: Money): boolean {
  return a.minor === 0;
}

/** Negative when `a` is less than `b`, zero when equal, positive when greater. */
export function compare(a: Money, b: Money): number {
  sameCurrency(a, b);
  return a.minor - b.minor;
}
