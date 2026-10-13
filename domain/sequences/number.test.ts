import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatSeriesNumber, isValidSeries, parseSeriesNumber } from "./number";

describe("a numbered series", () => {
  it("writes the prefix and the padded number", () => {
    expect(formatSeriesNumber("INV", 8)).toBe("INV-0008");
    expect(formatSeriesNumber("INV", 12_345)).toBe("INV-12345");
    expect(formatSeriesNumber("INV-B", 1, 6)).toBe("INV-B-000001");
  });

  it("refuses a series or a number that is not one", () => {
    expect(() => formatSeriesNumber("inv", 1)).toThrow(RangeError);
    expect(() => formatSeriesNumber("", 1)).toThrow(RangeError);
    expect(() => formatSeriesNumber("INV", 0)).toThrow(RangeError);
    expect(() => formatSeriesNumber("INV", 1.5)).toThrow(RangeError);
    for (const bad of ["2026", "INV-", "-INV", "INV--B", "A_B", "Inv"]) {
      expect(isValidSeries(bad), bad).toBe(false);
    }
    expect(isValidSeries("A".repeat(17))).toBe(false);
    expect(isValidSeries("A".repeat(16))).toBe(true);
  });

  it("reads a number back and refuses text that is not one", () => {
    expect(parseSeriesNumber("INV-0008")).toEqual({ series: "INV", value: 8 });
    for (const bad of ["", "INV", "-0008", "inv-0008", "INV-", "INV-00x8", "INV-0", "INV--1"]) {
      expect(parseSeriesNumber(bad), bad).toBeNull();
    }
  });

  it("reads back what it writes, in any series and width", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z][A-Z0-9]{0,6}(-[A-Z0-9]{1,5})?$/),
        fc.integer({ min: 1, max: 2_000_000_000 }),
        fc.integer({ min: 1, max: 10 }),
        (series, value, width) => {
          expect(parseSeriesNumber(formatSeriesNumber(series, value, width))).toEqual({
            series,
            value,
          });
        },
      ),
    );
  });

  it("orders numbers of one series by their value even when written with different paddings", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99_999 }),
        fc.integer({ min: 1, max: 99_999 }),
        (a, b) => {
          const left = parseSeriesNumber(formatSeriesNumber("INV", a));
          const right = parseSeriesNumber(formatSeriesNumber("INV", b, 8));
          expect(Math.sign((left?.value ?? 0) - (right?.value ?? 0))).toBe(Math.sign(a - b));
        },
      ),
    );
  });
});
