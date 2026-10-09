import { describe, expect, it } from "vitest";
import { preferenceKeys, preferences } from "./definitions";
import {
  carryAtSignIn,
  cookieFor,
  parsePreference,
  resolvePreferences,
  savedPreference,
  specFor,
} from "./resolve";

describe("the preference registry", () => {
  it("gives every preference a fallback its own schema accepts", () => {
    for (const key of preferenceKeys) {
      expect(preferences[key].schema.safeParse(preferences[key].fallback).success).toBe(true);
    }
  });

  it("gives every cookie a name of its own", () => {
    const names = preferenceKeys.flatMap((key) => {
      const definition: { cookie?: { name: string } } = preferences[key];
      return definition.cookie === undefined ? [] : [definition.cookie.name];
    });
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("resolving what is stored", () => {
  it("uses the saved value, the fallback when there is none, and the fallback for a stale one", () => {
    expect(resolvePreferences({})).toEqual({ theme: "system", locale: "pt-BR" });
    expect(resolvePreferences({ theme: "dark" }).theme).toBe("dark");
    expect(resolvePreferences({ theme: "sepia", locale: 3 })).toEqual({
      theme: "system",
      locale: "pt-BR",
    });
    expect(savedPreference({ theme: "sepia" }, "theme")).toBeUndefined();
    expect(savedPreference({}, "theme")).toBeUndefined();
  });

  it("does not read a key through the prototype", () => {
    expect(
      savedPreference(Object.create({ theme: "dark" }) as Record<string, unknown>, "theme"),
    ).toBeUndefined();
  });

  it("turns a value into its cookie, and the system theme into a cleared one", () => {
    expect(cookieFor("theme", "dark")).toEqual({ name: "theme", value: "dark" });
    expect(cookieFor("theme", "system")).toEqual({ name: "theme", value: null });
    expect(cookieFor("locale", "pt-BR")).toEqual({ name: "NEXT_LOCALE", value: "pt-BR" });
  });

  it("checks a value from outside, and refuses one that does not fit", () => {
    expect(parsePreference("theme", "dark")).toBe("dark");
    expect(() => parsePreference("theme", "sepia")).toThrow();
    expect(() => parsePreference("theme", undefined)).toThrow();
  });

  it("carries only what was saved to a new browser, and saves what the browser held", () => {
    expect(carryAtSignIn({}, {})).toEqual({ save: [], cookies: [] });
    expect(carryAtSignIn({ theme: "light" }, {}).cookies).toEqual([
      { name: "theme", value: "light" },
    ]);
    expect(carryAtSignIn({}, { theme: "dark" }).save).toEqual([{ key: "theme", value: "dark" }]);
  });

  it("gives a preference with no cookie of its own a JSON cookie named after it", () => {
    const spec = specFor("fontScale", undefined);
    expect(spec.name).toBe("pref-fontScale");
    expect(spec.encode(1.25)).toBe("1.25");
    expect(spec.encode({ a: [1] })).toBe('{"a":[1]}');
    expect(spec.decode("1.25")).toBe(1.25);
    expect(spec.decode('"two"')).toBe("two");
    // A cookie edited by hand into something that is not JSON reads as nothing, never as a throw.
    expect(spec.decode("{broken")).toBeUndefined();
    const own = { name: "theme", encode: () => null, decode: (raw: string) => raw };
    expect(specFor("theme", own)).toBe(own);
  });
});
