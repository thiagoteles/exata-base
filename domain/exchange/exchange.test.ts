import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { currencyCode } from "../money/currency";
import { money } from "../money/money";
import { convert, parseRate } from "./convert";
import {
  addDays,
  daysUpTo,
  fromDayNumber,
  isIsoDay,
  isWeekend,
  toDayNumber,
  weekdayOf,
} from "./dates";
import {
  defaultRatePolicy,
  pickRate,
  type RateChoice,
  type RateReference,
  rateChoices,
  rateReferences,
  referenceDay,
} from "./policy";

const USD = currencyCode("USD");
const BRL = currencyCode("BRL");
const JPY = currencyCode("JPY");
const KWD = currencyCode("KWD");

describe("calendar days", () => {
  it("counts days from the epoch and back", () => {
    expect(toDayNumber("1970-01-01")).toBe(0);
    expect(toDayNumber("1970-01-02")).toBe(1);
    expect(toDayNumber("1969-12-31")).toBe(-1);
    expect(fromDayNumber(0)).toBe("1970-01-01");
    expect(fromDayNumber(20_735)).toBe("2026-10-09");
  });

  it("knows the weekday: 2026-10-09 is a Friday and the next two days are the weekend", () => {
    expect(weekdayOf("2026-10-09")).toBe(5);
    expect(isWeekend("2026-10-09")).toBe(false);
    expect(isWeekend("2026-10-10")).toBe(true);
    expect(isWeekend("2026-10-11")).toBe(true);
    expect(weekdayOf("1970-01-01")).toBe(4);
  });

  it("adds days across months, years and a leap day", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("lists a day and the ones before it, newest first", () => {
    expect(daysUpTo("2026-10-09", 3)).toEqual(["2026-10-09", "2026-10-08", "2026-10-07"]);
  });

  it("tells a real day from a shaped one", () => {
    expect(isIsoDay("2026-10-09")).toBe(true);
    expect(isIsoDay("2024-02-29")).toBe(true);
    for (const bad of ["2026-02-30", "2026-13-01", "26-10-09", "", "2026-10-9"]) {
      expect(isIsoDay(bad), bad).toBe(false);
    }
    expect(() => toDayNumber("nonsense")).toThrow(RangeError);
  });

  it("round-trips any day in two centuries and moves one day at a time", () => {
    fc.assert(
      fc.property(fc.integer({ min: -36_500, max: 36_500 }), (number) => {
        const day = fromDayNumber(number);
        expect(toDayNumber(day)).toBe(number);
        expect(isIsoDay(day)).toBe(true);
        expect(toDayNumber(addDays(day, 1))).toBe(number + 1);
        expect(weekdayOf(addDays(day, 7))).toBe(weekdayOf(day));
      }),
    );
  });
});

describe("which day's quote converts an amount", () => {
  it("defaults to the sell quote of the day before issue", () => {
    expect(defaultRatePolicy).toEqual({ side: "sell", reference: "day_before_issue" });
  });

  it("names the day by the policy", () => {
    const days = { issue: "2026-10-12", receipt: "2026-10-20" };
    expect(referenceDay({ side: "sell", reference: "issue_day" }, days)).toBe("2026-10-12");
    expect(referenceDay({ side: "sell", reference: "day_before_issue" }, days)).toBe("2026-10-11");
    expect(referenceDay({ side: "buy", reference: "receipt_day" }, days)).toBe("2026-10-20");
  });

  it("names the day of the fiscal note, and the one before it, and has none until the note's day is known", () => {
    const days = { issue: "2026-10-12", nfse: "2026-10-21" };
    expect(referenceDay({ side: "sell", reference: "nfse_day" }, days)).toBe("2026-10-21");
    expect(referenceDay({ side: "sell", reference: "day_before_nfse" }, days)).toBe("2026-10-20");
    expect(
      referenceDay({ side: "sell", reference: "day_before_nfse" }, { issue: "2026-10-12" }),
    ).toBeNull();
    expect(
      referenceDay({ side: "sell", reference: "nfse_day" }, { issue: "2026-10-12" }),
    ).toBeNull();
  });

  it("has no day for a receipt policy before the receipt is known", () => {
    expect(
      referenceDay({ side: "buy", reference: "receipt_day" }, { issue: "2026-10-12" }),
    ).toBeNull();
  });

  it("offers both sides or no conversion, and every reference names a day once every day is known", () => {
    expect(rateChoices).toEqual<RateChoice[]>(["buy", "sell", "none"]);
    const days = { issue: "2026-10-09", receipt: "2026-10-20", nfse: "2026-10-12" };
    for (const reference of rateReferences) {
      expect(referenceDay({ side: "sell", reference }, days)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const noted: RateReference[] = ["nfse_day", "day_before_nfse"];
    for (const reference of noted) {
      expect(referenceDay({ side: "sell", reference }, { issue: "2026-10-09" })).toBeNull();
    }
  });

  it("picks the side of a quote", () => {
    expect(pickRate({ buy: "4.9853", sell: "4.9859" }, "buy")).toBe("4.9853");
    expect(pickRate({ buy: "4.9853", sell: "4.9859" }, "sell")).toBe("4.9859");
  });
});

describe("converting at a quote", () => {
  it("reads a decimal rate and refuses anything else", () => {
    expect(parseRate("5.4321")).toEqual({ digits: 54_321n, scale: 4 });
    expect(parseRate("5")).toEqual({ digits: 5n, scale: 0 });
    for (const bad of ["", "abc", "-1", "0", "0.0000", "1,5", "1.2.3"]) {
      expect(parseRate(bad), bad).toBeNull();
    }
  });

  it("converts dollars to reais at the quote, to the cent", () => {
    const rate = parseRate("5.4321");
    expect(rate).not.toBeNull();
    if (rate !== null) {
      expect(convert(money(100_000, USD), rate, BRL)).toEqual(money(543_210, BRL));
      expect(convert(money(1, USD), rate, BRL)).toEqual(money(5, BRL));
    }
  });

  it("rounds half away from zero, once", () => {
    const rate = parseRate("0.5");
    if (rate !== null) {
      expect(convert(money(1, USD), rate, BRL)).toEqual(money(1, BRL));
      expect(convert(money(-1, USD), rate, BRL)).toEqual(money(-1, BRL));
      expect(convert(money(3, USD), rate, BRL)).toEqual(money(2, BRL));
    }
  });

  it("moves between currencies of different digits", () => {
    const rate = parseRate("0.0347");
    if (rate !== null) {
      // 1000 yen is 1000 minor units, and 34.70 reais is 3470 minor units.
      expect(convert(money(1000, JPY), rate, BRL)).toEqual(money(3470, BRL));
    }
    const dinar = parseRate("16.2");
    if (dinar !== null) {
      // 1.000 KWD is 1000 minor units; 16.20 reais is 1620 minor units.
      expect(convert(money(100, KWD), dinar, BRL)).toEqual(money(162, BRL));
    }
  });

  it("is exact for the largest amounts a quote is asked for", () => {
    const rate = parseRate("5.4321");
    if (rate !== null) {
      expect(convert(money(1_000_000_000_000, USD), rate, BRL)).toEqual(
        money(5_432_100_000_000, BRL),
      );
    }
  });

  it("refuses a result outside the safe range", () => {
    const rate = parseRate("1000000");
    if (rate !== null) {
      expect(() => convert(money(Number.MAX_SAFE_INTEGER, USD), rate, BRL)).toThrow(RangeError);
    }
  });

  it("never differs from the exact value by more than half a minor unit", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.integer({ min: 1, max: 999_999 }),
        (minor, tenThousandths) => {
          const rate = parseRate(
            `${Math.trunc(tenThousandths / 10_000)}.${String(tenThousandths % 10_000).padStart(4, "0")}`,
          );
          if (rate === null) {
            return;
          }
          const converted = convert(money(minor, USD), rate, BRL).minor;
          const exact = (minor * tenThousandths) / 10_000;
          // Half a minor unit is the most a single rounding can move it; the epsilon is the float's.
          expect(Math.abs(converted - exact)).toBeLessThanOrEqual(0.5 + 1e-6);
        },
      ),
    );
  });
});
