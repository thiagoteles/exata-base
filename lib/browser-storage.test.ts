import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearVisitorValue,
  readAllVisitorValues,
  readVisitorValue,
  writeVisitorValue,
} from "./browser-storage";

function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("what a visitor keeps in the browser", () => {
  it("writes under a name of its own, reads it back and forgets it", () => {
    const storage = fakeStorage();
    vi.stubGlobal("localStorage", storage);
    writeVisitorValue("contactDraft", { subject: "support", body: "Oi" });
    expect([...storage.items.keys()]).toEqual(["visitor:contactDraft"]);
    expect(readVisitorValue("contactDraft")).toEqual({ subject: "support", body: "Oi" });
    clearVisitorValue("contactDraft");
    expect(readVisitorValue("contactDraft")).toBeUndefined();
  });

  it("hands over only what the registry keeps in the browser, and not what happens to be there", () => {
    vi.stubGlobal(
      "localStorage",
      fakeStorage({
        "visitor:contactDraft": '{"subject":"","body":"Oi"}',
        "visitor:theme": '"dark"',
        "visitor:other": "1",
        analytics: "x",
      }),
    );
    expect(readAllVisitorValues()).toEqual({ contactDraft: { subject: "", body: "Oi" } });
  });

  it("reads a value that is not JSON as nothing", () => {
    vi.stubGlobal("localStorage", fakeStorage({ "visitor:contactDraft": "{broken" }));
    expect(readVisitorValue("contactDraft")).toBeUndefined();
    expect(readAllVisitorValues()).toEqual({});
  });

  it("does nothing, and never throws, when the browser blocks storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => writeVisitorValue("contactDraft", { subject: "", body: "x" })).not.toThrow();
    expect(() => clearVisitorValue("contactDraft")).not.toThrow();
    expect(readVisitorValue("contactDraft")).toBeUndefined();
    expect(readAllVisitorValues()).toEqual({});
  });
});
