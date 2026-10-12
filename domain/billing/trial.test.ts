import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { trialStanding } from "./trial";

const DAY = 86_400_000;
const endsAt = new Date("2026-10-20T12:00:00Z");
const at = (daysBefore: number, extraMs = 0) =>
  new Date(endsAt.getTime() - daysBefore * DAY - extraMs);

describe("a trial's standing", () => {
  it("counts the days left, rounding a started day up", () => {
    expect(trialStanding({ endsAt, totalDays: 14, now: at(10) })).toMatchObject({
      state: "running",
      daysLeft: 10,
      daysUsed: 4,
    });
    expect(trialStanding({ endsAt, totalDays: 14, now: at(9, 60_000) })).toMatchObject({
      daysLeft: 10,
    });
    expect(trialStanding({ endsAt, totalDays: 14, now: at(0, 10 * 60_000) })).toMatchObject({
      state: "last-day",
      daysLeft: 1,
    });
  });

  it("is over at the end instant and after it, with every day used", () => {
    expect(trialStanding({ endsAt, totalDays: 14, now: endsAt })).toMatchObject({
      state: "ended",
      daysLeft: 0,
      daysUsed: 14,
    });
    expect(trialStanding({ endsAt, totalDays: 14, now: at(-3) })).toMatchObject({
      state: "ended",
      daysLeft: 0,
    });
  });

  it("never shows more days left than the trial is long, even before it began", () => {
    expect(trialStanding({ endsAt, totalDays: 14, now: at(40) })).toMatchObject({
      daysLeft: 14,
      daysUsed: 0,
    });
  });
});

describe("a trial's standing, in general", () => {
  it("keeps the days left and the days used inside the length, and adding to a total", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 90 }),
        fc.integer({ min: -5 * DAY, max: 120 * DAY }),
        (totalDays, before) => {
          const standing = trialStanding({
            endsAt,
            totalDays,
            now: new Date(endsAt.getTime() - before),
          });
          expect(standing.daysLeft).toBeGreaterThanOrEqual(0);
          expect(standing.daysLeft).toBeLessThanOrEqual(totalDays);
          expect(standing.daysLeft + standing.daysUsed).toBe(totalDays);
          expect(standing.state === "ended").toBe(standing.daysLeft === 0);
        },
      ),
    );
  });

  it("never gains days as time passes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 * DAY }),
        fc.integer({ min: 0, max: 10 * DAY }),
        (before, later) => {
          const now = new Date(endsAt.getTime() - before);
          const after = new Date(now.getTime() + later);
          expect(trialStanding({ endsAt, totalDays: 30, now: after }).daysLeft).toBeLessThanOrEqual(
            trialStanding({ endsAt, totalDays: 30, now }).daysLeft,
          );
        },
      ),
    );
  });
});

describe("whether a purchase gets a trial", () => {
  const trial = { days: 14, intervals: ["monthly", "yearly"] };
  const never: Date | null = null;
  const before = new Date("2026-01-01T00:00:00Z");

  it("gives the catalog's days to a subscription of an account that never had one", async () => {
    const { trialDaysFor } = await import("./trial");
    expect(trialDaysFor({ trial, interval: "monthly", trialUsedAt: never })).toBe(14);
    expect(trialDaysFor({ trial, interval: "yearly", trialUsedAt: never })).toBe(14);
  });

  it("gives none to a one-off payment, to an account that already had its trial, or when it is off", async () => {
    const { trialDaysFor } = await import("./trial");
    expect(trialDaysFor({ trial, interval: "lifetime", trialUsedAt: never })).toBe(0);
    expect(trialDaysFor({ trial, interval: "yearly_once", trialUsedAt: never })).toBe(0);
    expect(trialDaysFor({ trial, interval: "monthly", trialUsedAt: before })).toBe(0);
    expect(
      trialDaysFor({
        trial: { days: 0, intervals: ["monthly"] },
        interval: "monthly",
        trialUsedAt: never,
      }),
    ).toBe(0);
    expect(
      trialDaysFor({
        trial: { days: -3, intervals: ["monthly"] },
        interval: "monthly",
        trialUsedAt: never,
      }),
    ).toBe(0);
  });
});
