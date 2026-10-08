/*
 * Money is an integer number of cents everywhere: in the database, in actions and in tests.
 * Reais only exist on screen, formatted by `formatBRL` and read back by `parseBRL`.
 */

declare const centsBrand: unique symbol;
export type Cents = number & { readonly [centsBrand]: true };

export function toCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Cents must be a safe integer, received ${value}`);
  }
  return value as Cents;
}

const CENTS_PER_REAL = 100;
const NO_BREAK_SPACE = " ";
const reais = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0, useGrouping: true });

/** `123456` becomes `R$ 1.234,56`, with a no-break space, as Intl writes it for pt-BR. */
export function formatBRL(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const whole = Math.trunc(absolute / CENTS_PER_REAL);
  const fraction = String(absolute % CENTS_PER_REAL).padStart(2, "0");
  return `${sign}R$${NO_BREAK_SPACE}${reais.format(whole)},${fraction}`;
}

const grouped = /^\d{1,3}(?:\.\d{3})*$/;
const plain = /^\d+$/;
const centsPart = /^\d{1,2}$/;

/** Reads what a person types: `1.234,56`, `R$ 1234,5`, `-10`. Returns null for anything else. */
export function parseBRL(input: string): Cents | null {
  const compact = input.replace(/R\$/g, "").replace(/[\s ]/g, "");
  const negative = compact.startsWith("-");
  const unsigned = negative ? compact.slice(1) : compact;
  const [whole = "", fraction = "", ...rest] = unsigned.split(",");

  const wholeIsValid = grouped.test(whole) || plain.test(whole);
  const fractionIsValid = fraction === "" || centsPart.test(fraction);
  if (
    rest.length > 0 ||
    !wholeIsValid ||
    !fractionIsValid ||
    (unsigned.endsWith(",") && fraction === "")
  ) {
    return null;
  }

  const total = Number(whole.replace(/\./g, "")) * CENTS_PER_REAL + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(total)) {
    return null;
  }
  return toCents(negative ? -total : total);
}

/** A price as the payment provider reports it, in the currency it was set in. */
export function formatPrice(cents: Cents, currency: string): string {
  if (currency.toLowerCase() === "brl") {
    return formatBRL(cents);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / CENTS_PER_REAL);
}
