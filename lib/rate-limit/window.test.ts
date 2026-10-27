import { describe, expect, it } from "vitest";
import { windowOf } from "./service";

const daily = { name: "exports", limit: 5, per: "day" } as const;
// São Paulo is three hours behind UTC, so its midnight is 03:00 UTC.
const at = (iso: string) => new Date(iso);

describe("a daily window", () => {
  // Fails when a daily allowance starts again at midnight UTC, which is 21:00 in São Paulo.
  it("starts again at midnight in São Paulo, not at midnight UTC", () => {
    const before = windowOf(daily, at("2026-10-27T02:59:00Z")); // 23:59 on the 26th
    const after = windowOf(daily, at("2026-10-27T03:01:00Z")); // 00:01 on the 27th
    expect(before.start).not.toEqual(after.start);
    expect(after.start).toEqual(at("2026-10-27T03:00:00Z"));

    const eveningBefore = windowOf(daily, at("2026-10-26T23:59:00Z")); // 20:59
    const eveningAfter = windowOf(daily, at("2026-10-27T00:01:00Z")); // 21:01
    expect(eveningBefore.start).toEqual(eveningAfter.start);
  });

  it("ends at the next midnight, an hour away at 23:00", () => {
    const now = at("2026-10-27T02:00:00Z"); // 23:00 on the 26th
    expect(windowOf(daily, now).end.getTime() - now.getTime()).toBe(3_600_000);
  });

  // Fails when a day with summer time is taken as 24 hours: the clock skipped or repeated an hour.
  it("follows a day that summer time made 23 or 25 hours long", () => {
    // 2018-11-04 began at 01:00 (the clock jumped over midnight); 2019-02-16 ended an hour late.
    const short = windowOf(daily, at("2018-11-04T12:00:00Z"));
    expect(short.start).toEqual(at("2018-11-04T03:00:00Z"));
    expect(short.end.getTime() - short.start.getTime()).toBe(23 * 3_600_000);
    const long = windowOf(daily, at("2019-02-16T12:00:00Z"));
    expect(long.end).toEqual(at("2019-02-17T03:00:00Z"));
    expect(long.end.getTime() - long.start.getTime()).toBe(25 * 3_600_000);
  });

  it("keeps a window of seconds as it was, counted from 1970", () => {
    const now = at("2026-10-27T00:00:30Z");
    expect(windowOf({ name: "form", limit: 5, windowSeconds: 60 }, now)).toEqual({
      start: at("2026-10-27T00:00:00Z"),
      end: at("2026-10-27T00:01:00Z"),
    });
  });
});
