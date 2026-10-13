import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { currencyCode } from "./currency";
import { decimalText, formatMoney, parseMoney } from "./format";
import { add, money, negate, subtract } from "./money";

const currencies = ["BRL", "USD", "EUR", "JPY", "KWD", "CLP", "CHF", "GBP"].map(currencyCode);
const currency = fc.constantFrom(...currencies);
const locale = fc.constantFrom("pt-BR", "en", "es", "de");
// Well inside the safe range, so a sum of two never leaves it.
const minor = fc.integer({ min: -1_000_000_000_000, max: 1_000_000_000_000 });
const amount = fc.record({ minor, currency }).map((value) => money(value.minor, value.currency));
// Written out by hand, so the test does not repeat the table it checks.
const expectedDigits: Readonly<Record<string, number>> = { JPY: 0, CLP: 0, KWD: 3 };

describe("money arithmetic", () => {
  it("subtracting what was added returns the original", () => {
    fc.assert(
      fc.property(amount, minor, (a, delta) => {
        const b = money(delta, a.currency);
        expect(subtract(add(a, b), b)).toEqual(a);
      }),
    );
  });

  it("is commutative inside one currency", () => {
    fc.assert(
      fc.property(amount, minor, (a, delta) => {
        const b = money(delta, a.currency);
        expect(add(a, b)).toEqual(add(b, a));
      }),
    );
  });

  it("negating twice returns the original", () => {
    fc.assert(
      fc.property(amount, (a) => {
        expect(negate(negate(a))).toEqual(a);
      }),
    );
  });
});

describe("the text of money", () => {
  it("is the exact decimal of the minor units", () => {
    fc.assert(
      fc.property(amount, (a) => {
        const text = decimalText(a);
        const digits = text.includes(".") ? (text.split(".")[1] ?? "").length : 0;
        expect(Number(text.replace(".", ""))).toBe(a.minor);
        expect(digits).toBe(expectedDigits[a.currency] ?? 2);
      }),
    );
  });

  it("is read back to the same amount in every language", () => {
    fc.assert(
      fc.property(amount, locale, (a, language) => {
        expect(parseMoney(formatMoney(a, language), a.currency, language)).toEqual(
          a.minor === 0 ? money(0, a.currency) : a,
        );
      }),
    );
  });
});
