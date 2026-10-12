import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatBRL, formatMoney, parseBRL, toCents } from "./money";

const cents = fc.integer({ min: -1e15, max: 1e15 }).map(toCents);

describe("money in cents", () => {
  it("survives a round trip through the screen without gaining or losing a cent", () => {
    fc.assert(fc.property(cents, (value) => parseBRL(formatBRL(value)) === value));
  });

  it("formats like Intl does for pt-BR", () => {
    expect(formatBRL(toCents(123_456))).toBe("R$ 1.234,56");
    expect(formatBRL(toCents(-5))).toBe("-R$ 0,05");
  });

  it("reads what a person types", () => {
    expect(parseBRL("1.234,56")).toBe(123_456);
    expect(parseBRL("R$ 1234,5")).toBe(123_450);
    expect(parseBRL("10")).toBe(1000);
    expect(parseBRL("-0,01")).toBe(-1);
  });

  it("refuses anything ambiguous", () => {
    for (const input of ["", "1,234", "1.23,00", "12,", "1,2,3", "abc", "1.2345"]) {
      expect(parseBRL(input)).toBeNull();
    }
  });

  it("never stores a fraction of a cent", () => {
    expect(() => toCents(10.5)).toThrow(RangeError);
  });
});

describe("formatMoney", () => {
  it("writes reais the way the rest of the app does, and other currencies with Intl", () => {
    expect(formatMoney(toCents(2990), "brl")).toBe(formatBRL(toCents(2990)));
    expect(formatMoney(toCents(1000), "usd")).toContain("10,00");
    expect(formatMoney(toCents(1000), "usd")).toContain("US$");
  });
});

describe("money in another language", () => {
  it("keeps the app's own reais in the default language and uses the language's form elsewhere", () => {
    expect(formatMoney(toCents(123_456), "brl", "pt-BR")).toBe(formatBRL(toCents(123_456)));
    expect(formatMoney(toCents(123_456), "usd", "en-US")).toBe("$1,234.56");
    expect(formatMoney(toCents(123_456), "brl", "en-US")).toBe("R$1,234.56");
  });
});
