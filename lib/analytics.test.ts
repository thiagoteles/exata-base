import { afterEach, describe, expect, it, vi } from "vitest";
import { identify, track } from "./analytics";

const holder = globalThis as { window?: unknown };

afterEach(() => {
  Reflect.deleteProperty(holder, "window");
});

describe("analytics", () => {
  it("does nothing without the Umami script", () => {
    holder.window = {};
    expect(() => {
      track("signup_completed");
      identify("u1", { attempts: 1, everyMs: 10 })();
    }).not.toThrow();
  });

  it("forwards events and the account id to Umami when the script is loaded", () => {
    const calls: unknown[] = [];
    holder.window = {
      umami: {
        track: (...args: unknown[]) => calls.push(["track", ...args]),
        identify: (id: string) => calls.push(["identify", id]),
      },
    };
    track("checkout_started", { interval: "yearly", source: "plans" });
    identify("u1");
    expect(calls).toEqual([
      ["track", "checkout_started", { interval: "yearly", source: "plans" }],
      ["identify", "u1"],
    ]);
  });

  it("waits for the script to load before identifying, and gives up after the last attempt", () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    holder.window = {};
    identify("u1", { attempts: 3, everyMs: 100 });
    vi.advanceTimersByTime(100);
    holder.window = { umami: { track: () => undefined, identify: (id: string) => calls.push(id) } };
    vi.advanceTimersByTime(500);
    expect(calls).toEqual(["u1"]);

    holder.window = {};
    const stop = identify("u2", { attempts: 3, everyMs: 100 });
    vi.advanceTimersByTime(1000);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
