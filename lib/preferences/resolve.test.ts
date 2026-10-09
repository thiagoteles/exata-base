import { describe, expect, it } from "vitest";
import { browserPreferenceKeys, preferenceKeys, preferences } from "./definitions";
import {
  carryAtSignIn,
  cookieFor,
  parsePreference,
  resolvePreferences,
  savedPreference,
  specFor,
} from "./resolve";

const defaults = {
  theme: "system",
  fontScale: "default",
  motion: "system",
  contrast: "system",
  timeZone: "America/Sao_Paulo",
  email: { reminders: true, news: false },
  contactDraft: null,
  locale: "pt-BR",
};

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
    expect(resolvePreferences({})).toEqual(defaults);
    expect(resolvePreferences({ theme: "dark" }).theme).toBe("dark");
    expect(resolvePreferences({ theme: "sepia", locale: 3, timeZone: "Mars/Base" })).toEqual(
      defaults,
    );
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

  it("takes the person's time zone only if it is one, and falls back to the product's", () => {
    expect(resolvePreferences({ timeZone: "Asia/Tokyo" }).timeZone).toBe("Asia/Tokyo");
    expect(resolvePreferences({ timeZone: "Asia/Nowhere" }).timeZone).toBe("America/Sao_Paulo");
    expect(parsePreference("timeZone", "UTC")).toBe("UTC");
    expect(() => parsePreference("timeZone", "../etc/passwd")).toThrow();
    expect(() => parsePreference("timeZone", 3)).toThrow();
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

  it("keeps what is too big for a cookie out of cookies: a draft has none, either way", () => {
    expect(browserPreferenceKeys).toEqual(["contactDraft"]);
    expect(cookieFor("contactDraft", { subject: "support", body: "Oi" })).toBeNull();
    expect(carryAtSignIn({ contactDraft: { subject: "", body: "Oi" } }, {})).toEqual({
      save: [],
      cookies: [],
    });
    // Even a cookie of that name, which the registry never wrote, is not read as a draft.
    expect(carryAtSignIn({}, { "pref-contactDraft": '{"subject":"","body":"x"}' }).save).toEqual(
      [],
    );
  });

  it("limits a draft to what the schema says, and lets it be cleared with null", () => {
    expect(parsePreference("contactDraft", null)).toBeNull();
    expect(parsePreference("contactDraft", { subject: "", body: "x".repeat(5000) })).toBeDefined();
    expect(() =>
      parsePreference("contactDraft", { subject: "", body: "x".repeat(5001) }),
    ).toThrow();
    expect(() => parsePreference("contactDraft", { body: "sem assunto" })).toThrow();
  });
});
