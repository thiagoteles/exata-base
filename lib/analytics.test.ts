import { afterEach, describe, expect, it } from "vitest";
import { identify, track } from "./analytics";

const holder = globalThis as { window?: unknown };

afterEach(() => {
  Reflect.deleteProperty(holder, "window");
});

describe("analytics", () => {
  it("does nothing without the Umami script", () => {
    holder.window = {};
    expect(() => {
      track("signup");
      identify("u1");
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
    track("checkout", { plan: "yearly" });
    identify("u1");
    expect(calls).toEqual([
      ["track", "checkout", { plan: "yearly" }],
      ["identify", "u1"],
    ]);
  });
});
