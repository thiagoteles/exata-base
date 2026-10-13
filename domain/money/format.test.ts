import { describe, expect, it } from "vitest";
import { currencyCode } from "./currency";
import { decimalText, formatMoney, parseMoney } from "./format";
import { money } from "./money";

const BRL = currencyCode("BRL");
const USD = currencyCode("USD");
const EUR = currencyCode("EUR");
const JPY = currencyCode("JPY");
const KWD = currencyCode("KWD");

const plain = (text: string) => text.replace(/[  ]/g, " ");

describe("the text of an amount", () => {
  it("puts the decimal point by the currency's digits", () => {
    expect(decimalText(money(123_456, BRL))).toBe("1234.56");
    expect(decimalText(money(1000, JPY))).toBe("1000");
    expect(decimalText(money(-5, KWD))).toBe("-0.005");
    expect(decimalText(money(5, BRL))).toBe("0.05");
    expect(decimalText(money(0, BRL))).toBe("0.00");
  });

  it("keeps every digit of a large amount", () => {
    expect(decimalText(money(Number.MAX_SAFE_INTEGER, USD))).toBe("90071992547409.91");
  });
});

describe("formatting for a language", () => {
  it("writes reais the way the base does for pt-BR", () => {
    expect(plain(formatMoney(money(123_456, BRL), "pt-BR"))).toBe("R$ 1.234,56");
  });

  it("writes another currency with the language's symbol and separators", () => {
    expect(plain(formatMoney(money(240_000, USD), "pt-BR"))).toBe("US$ 2.400,00");
    expect(plain(formatMoney(money(90_000, EUR), "pt-BR"))).toBe("€ 900,00");
    expect(formatMoney(money(240_000, USD), "en")).toBe("$2,400.00");
  });

  it("writes no fraction for a currency without one and three digits for KWD", () => {
    expect(plain(formatMoney(money(1000, JPY), "pt-BR"))).toBe("JP¥ 1.000");
    expect(plain(formatMoney(money(5, KWD), "en"))).toBe("KWD 0.005");
  });

  it("writes a negative amount with its sign", () => {
    expect(plain(formatMoney(money(-123_456, BRL), "pt-BR"))).toContain("-");
  });

  it("formats the same amount again from the cache", () => {
    const a = formatMoney(money(1, USD), "en");
    expect(formatMoney(money(1, USD), "en")).toBe(a);
  });
});

describe("reading what a person typed", () => {
  it("reads grouped and plain amounts in pt-BR", () => {
    expect(parseMoney("1.234,56", BRL, "pt-BR")).toEqual(money(123_456, BRL));
    expect(parseMoney("1234,56", BRL, "pt-BR")).toEqual(money(123_456, BRL));
    expect(parseMoney("12,5", BRL, "pt-BR")).toEqual(money(1250, BRL));
    expect(parseMoney("1.234", BRL, "pt-BR")).toEqual(money(123_400, BRL));
    expect(parseMoney("0,05", BRL, "pt-BR")).toEqual(money(5, BRL));
  });

  it("reads an amount with its symbol or code, with or without spaces", () => {
    expect(parseMoney("R$ 1.234,56", BRL, "pt-BR")).toEqual(money(123_456, BRL));
    expect(parseMoney("R$1.234,56", BRL, "pt-BR")).toEqual(money(123_456, BRL));
    expect(parseMoney("US$ 2.400,00", USD, "pt-BR")).toEqual(money(240_000, USD));
    expect(parseMoney("USD 2.400,00", USD, "pt-BR")).toEqual(money(240_000, USD));
    expect(parseMoney("2.400,00 USD", USD, "pt-BR")).toEqual(money(240_000, USD));
  });

  it("reads a negative amount before or after the symbol", () => {
    expect(parseMoney("-1.234,56", BRL, "pt-BR")).toEqual(money(-123_456, BRL));
    expect(parseMoney("-R$ 1.234,56", BRL, "pt-BR")).toEqual(money(-123_456, BRL));
    expect(parseMoney("R$ -1.234,56", BRL, "pt-BR")).toEqual(money(-123_456, BRL));
    expect(parseMoney("−1,00", BRL, "pt-BR")).toEqual(money(-100, BRL));
  });

  it("reads minus zero as zero", () => {
    expect(parseMoney("-0,00", BRL, "pt-BR")).toEqual(money(0, BRL));
  });

  it("reads English separators in English", () => {
    expect(parseMoney("2,400.50", USD, "en")).toEqual(money(240_050, USD));
    expect(parseMoney("$2,400.50", USD, "en")).toEqual(money(240_050, USD));
  });

  it("reads a currency without a fraction and refuses a fraction for it", () => {
    expect(parseMoney("1.000", JPY, "pt-BR")).toEqual(money(1000, JPY));
    expect(parseMoney("1.000,5", JPY, "pt-BR")).toBeNull();
  });

  it("refuses more digits after the separator than the currency has", () => {
    expect(parseMoney("1,005", BRL, "pt-BR")).toBeNull();
    expect(parseMoney("0,0005", KWD, "pt-BR")).toBeNull();
    expect(parseMoney("0,005", KWD, "pt-BR")).toEqual(money(5, KWD));
  });

  it("refuses text that is not an amount", () => {
    for (const bad of ["", "abc", "12abc", "1,2,3", "1..000,00", "1.00,00", ",50", "R$", "--1"]) {
      expect(parseMoney(bad, BRL, "pt-BR"), bad).toBeNull();
    }
  });

  it("refuses an amount past the safe range", () => {
    expect(parseMoney("99999999999999999999,99", BRL, "pt-BR")).toBeNull();
  });
});
