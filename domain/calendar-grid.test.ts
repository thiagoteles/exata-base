import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  clampDate,
  daysInMonth,
  isIsoDate,
  monthWeeks,
  startOfMonth,
  startOfWeek,
  weekdayOf,
} from "./calendar-grid";

const aDate = fc
  .date({
    min: new Date("1900-01-01T00:00:00Z"),
    max: new Date("2200-12-31T00:00:00Z"),
    noInvalidDate: true,
  })
  .map((date) => date.toISOString().slice(0, 10));

describe("calendar arithmetic", () => {
  it("knows which dates exist", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2023-02-29")).toBe(false);
    expect(isIsoDate("2024-13-01")).toBe(false);
    expect(isIsoDate("24-01-01")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  it("moves across month and year ends", () => {
    expect(addDays("2024-12-31", 1)).toBe("2025-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2023-01-31", 1)).toBe("2023-02-28");
    expect(addMonths("2024-01-15", -1)).toBe("2023-12-15");
    expect(addMonths("2024-11-30", 3)).toBe("2025-02-28");
  });

  it("knows the weekday and the start of a week for either convention", () => {
    expect(weekdayOf("2026-10-09")).toBe(5);
    expect(startOfWeek("2026-10-09", 0)).toBe("2026-10-04");
    expect(startOfWeek("2026-10-09", 1)).toBe("2026-10-05");
    expect(startOfWeek("2026-10-04", 0)).toBe("2026-10-04");
    expect(startOfWeek("2026-10-04", 1)).toBe("2026-09-28");
  });

  it("counts the days of a month, leap years included", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2024, 12)).toBe(31);
    expect(daysInMonth(2024, 4)).toBe(30);
  });

  it("clamps into a range, and leaves a date alone when there is none", () => {
    expect(clampDate("2024-05-01", "2024-06-01", "2024-07-01")).toBe("2024-06-01");
    expect(clampDate("2024-08-01", "2024-06-01", "2024-07-01")).toBe("2024-07-01");
    expect(clampDate("2024-06-15", "2024-06-01", "2024-07-01")).toBe("2024-06-15");
    expect(clampDate("2024-06-15")).toBe("2024-06-15");
  });
});

describe("calendar arithmetic, in general", () => {
  it("adding days and taking them back returns the same date", () => {
    fc.assert(
      fc.property(aDate, fc.integer({ min: -4000, max: 4000 }), (date, days) => {
        expect(addDays(addDays(date, days), -days)).toBe(date);
        expect(isIsoDate(addDays(date, days))).toBe(true);
      }),
    );
  });

  it("a month never loses or gains a day and always lands on a real date", () => {
    fc.assert(
      fc.property(aDate, fc.integer({ min: -240, max: 240 }), (date, months) => {
        const moved = addMonths(date, months);
        expect(isIsoDate(moved)).toBe(true);
        expect(Number(moved.slice(8))).toBeLessThanOrEqual(Number(date.slice(8)));
      }),
    );
  });

  it("a month is drawn as whole weeks that start on the chosen day and hold every day once", () => {
    fc.assert(
      fc.property(aDate, fc.integer({ min: 0, max: 6 }), (date, weekStart) => {
        const weeks = monthWeeks(date, weekStart);
        expect(weeks.length).toBeGreaterThanOrEqual(4);
        expect(weeks.length).toBeLessThanOrEqual(6);
        const flat = weeks.flat();
        expect(new Set(flat).size).toBe(flat.length);
        for (const week of weeks) {
          expect(week).toHaveLength(7);
          expect(weekdayOf(week[0] ?? "")).toBe(weekStart);
        }
        const inMonth = flat.filter((day) => day.startsWith(date.slice(0, 7)));
        expect(inMonth).toHaveLength(
          daysInMonth(Number(date.slice(0, 4)), Number(date.slice(5, 7))),
        );
        expect(inMonth[0]).toBe(startOfMonth(date));
      }),
    );
  });
});
