import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isFixedTerm, oneYearAfter, termEnded, termEndsSoon } from "./term";

const DAY = 86_400_000;

describe("a plan bought for a year", () => {
  it("is a fixed term only for the one-off yearly interval", () => {
    expect(isFixedTerm("yearly_once")).toBe(true);
    for (const other of ["monthly", "yearly", "lifetime", null]) {
      expect(isFixedTerm(other)).toBe(false);
    }
  });

  it("ends a year after the purchase, to the moment, leap days included", () => {
    expect(oneYearAfter(new Date("2026-10-09T12:34:56Z")).toISOString()).toBe(
      "2027-10-09T12:34:56.000Z",
    );
    expect(oneYearAfter(new Date("2024-02-29T10:00:00Z")).toISOString()).toBe(
      "2025-02-28T10:00:00.000Z",
    );
    expect(oneYearAfter(new Date("2027-12-31T23:59:59Z")).toISOString()).toBe(
      "2028-12-31T23:59:59.000Z",
    );
  });

  it("is over at the end instant and after, not before", () => {
    const end = new Date("2027-10-09T12:00:00Z");
    expect(termEnded(end, new Date(end.getTime() - 1))).toBe(false);
    expect(termEnded(end, end)).toBe(true);
    expect(termEnded(end, new Date(end.getTime() + DAY))).toBe(true);
  });

  it("warns inside the window and not before it, not after the end", () => {
    const end = new Date("2027-10-09T12:00:00Z");
    expect(termEndsSoon(end, new Date(end.getTime() - 8 * DAY), 7)).toBe(false);
    expect(termEndsSoon(end, new Date(end.getTime() - 7 * DAY), 7)).toBe(true);
    expect(termEndsSoon(end, new Date(end.getTime() - 1), 7)).toBe(true);
    expect(termEndsSoon(end, end, 7)).toBe(false);
  });

  it("always ends after it began, by 365 or 366 days", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2000-01-01T00:00:00Z"),
          max: new Date("2100-12-31T00:00:00Z"),
          noInvalidDate: true,
        }),
        (start) => {
          const days = (oneYearAfter(start).getTime() - start.getTime()) / DAY;
          expect([365, 366]).toContain(days);
        },
      ),
    );
  });
});
