import { describe, expect, it } from "vitest";
import { jobState, windowMs } from "./job-health";

const window = windowMs("88200s");
const now = new Date("2026-10-09T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("job health", () => {
  it("reads the alarm's window in seconds, and refuses any other unit", () => {
    expect(window).toBe(88_200_000);
    expect(() => windowMs("24h")).toThrow("number of seconds");
    expect(() => windowMs("")).toThrow();
  });

  it("is never run, ok, failing or late", () => {
    expect(jobState(null, window, now)).toBe("never");
    expect(jobState({ ranAt: ago(1000), failed: 0 }, window, now)).toBe("ok");
    expect(jobState({ ranAt: ago(1000), failed: 2 }, window, now)).toBe("failing");
    expect(jobState({ ranAt: ago(window + 1), failed: 0 }, window, now)).toBe("late");
  });

  it("is still on time at the edge of the window, and late past it even when it failed", () => {
    expect(jobState({ ranAt: ago(window), failed: 0 }, window, now)).toBe("ok");
    expect(jobState({ ranAt: ago(window + 1), failed: 3 }, window, now)).toBe("late");
  });
});
