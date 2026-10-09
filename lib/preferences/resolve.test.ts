import { describe, expect, it } from "vitest";
import { preferenceKeys, preferences } from "./definitions";
import { cookieFor, cookiesForSaved, resolvePreferences, savedPreference } from "./resolve";

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

  it("carries only what was saved to a new browser", () => {
    expect(cookiesForSaved({})).toEqual([]);
    expect(cookiesForSaved({ theme: "light" })).toEqual([{ name: "theme", value: "light" }]);
  });
});
