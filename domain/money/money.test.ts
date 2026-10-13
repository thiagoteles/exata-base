import { describe, expect, it } from "vitest";
import { currencyCode, exponentOf, exponentOverrides } from "./currency";
import { add, compare, isZero, money, negate, subtract } from "./money";

const BRL = currencyCode("BRL");
const USD = currencyCode("USD");
const JPY = currencyCode("JPY");
const KWD = currencyCode("KWD");

describe("currency codes", () => {
  it("accepts three uppercase letters", () => {
    expect(currencyCode("EUR")).toBe("EUR");
  });

  it("refuses lowercase, short, long and mixed codes", () => {
    for (const bad of ["eur", "EU", "EURO", "E1R", "", " USD"]) {
      expect(() => currencyCode(bad)).toThrow(RangeError);
    }
  });

  it("gives two digits to a currency with no entry and the listed digits to the others", () => {
    expect(exponentOf(BRL)).toBe(2);
    expect(exponentOf(USD)).toBe(2);
    expect(exponentOf(JPY)).toBe(0);
    expect(exponentOf(KWD)).toBe(3);
    expect(exponentOf(currencyCode("CLF"))).toBe(4);
  });

  it("agrees with the platform's own table except where the standard and common use differ", () => {
    const platformDigits = (code: string) =>
      new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions()
        .maximumFractionDigits;
    const differing = Object.entries(exponentOverrides)
      .filter(([code, digits]) => platformDigits(code) !== digits)
      .map(([code]) => code);
    // The standard gives IQD three digits and the platform's data gives it none. The table follows the
    // standard and formatting passes the digits explicitly, so the two never disagree on screen. A new
    // difference here is a typo in the table or a deliberate choice to record.
    expect(differing).toEqual(["IQD"]);
    expect(Object.keys(exponentOverrides).length).toBeGreaterThan(20);
  });
});

describe("money", () => {
  it("holds a whole number of minor units", () => {
    expect(money(1999, USD)).toEqual({ minor: 1999, currency: "USD" });
  });

  it("refuses a fraction, a non-number and a value past the safe range", () => {
    expect(() => money(1.5, USD)).toThrow(RangeError);
    expect(() => money(Number.NaN, USD)).toThrow(RangeError);
    expect(() => money(Number.MAX_SAFE_INTEGER + 1, USD)).toThrow(RangeError);
  });

  it("adds, subtracts and negates inside one currency", () => {
    expect(add(money(150, BRL), money(275, BRL))).toEqual(money(425, BRL));
    expect(subtract(money(150, BRL), money(275, BRL))).toEqual(money(-125, BRL));
    expect(negate(money(150, BRL))).toEqual(money(-150, BRL));
  });

  it("negates zero to zero and not to a negative zero", () => {
    expect(Object.is(negate(money(0, BRL)).minor, 0)).toBe(true);
  });

  it("refuses to add, subtract or compare two currencies", () => {
    expect(() => add(money(1, BRL), money(1, USD))).toThrow(RangeError);
    expect(() => subtract(money(1, BRL), money(1, USD))).toThrow(RangeError);
    expect(() => compare(money(1, BRL), money(1, USD))).toThrow(RangeError);
  });

  it("refuses a sum that leaves the safe range", () => {
    expect(() => add(money(Number.MAX_SAFE_INTEGER, USD), money(1, USD))).toThrow(RangeError);
  });

  it("orders amounts and knows zero", () => {
    expect(compare(money(5, USD), money(9, USD))).toBeLessThan(0);
    expect(compare(money(9, USD), money(9, USD))).toBe(0);
    expect(compare(money(9, USD), money(5, USD))).toBeGreaterThan(0);
    expect(isZero(money(0, USD))).toBe(true);
    expect(isZero(money(1, USD))).toBe(false);
  });
});
