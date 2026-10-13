/*
 * ISO 4217 currency codes and how many digits follow the decimal separator in each. An amount of
 * money is a whole number of minor units, so the exponent is what turns it into the number a person
 * reads. Codes here are uppercase, as the standard writes them; the billing prices keep the
 * lowercase codes providers use and are converted at the edge.
 */

declare const currencyBrand: unique symbol;
export type CurrencyCode = string & { readonly [currencyBrand]: true };

const CODE_SHAPE = /^[A-Z]{3}$/;

export function currencyCode(value: string): CurrencyCode {
  if (!CODE_SHAPE.test(value)) {
    throw new RangeError(`A currency code is three uppercase letters, received "${value}"`);
  }
  return value as CurrencyCode;
}

const DEFAULT_EXPONENT = 2;

/**
 * The currencies whose minor unit is not a hundredth. Every other code has two digits, so the list
 * stays short and a new currency with two digits needs no entry.
 */
export const exponentOverrides: Readonly<Record<string, number>> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  CLF: 4,
  UYW: 4,
};

/** How many digits follow the decimal separator: 0 for JPY, 2 for BRL, 3 for KWD. */
export function exponentOf(currency: CurrencyCode): number {
  return exponentOverrides[currency] ?? DEFAULT_EXPONENT;
}
