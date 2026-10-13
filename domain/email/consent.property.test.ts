import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  defaultEmailPreferences,
  type EmailPreferences,
  emailCategories,
  mayEmail,
} from "./consent";

const preferences = fc.record({ reminders: fc.boolean(), news: fc.boolean() });
const anyone = fc.option(preferences, { nil: null });

describe("who may be e-mailed what", () => {
  it("always reaches anyone with what they need to run their account", () => {
    fc.assert(
      fc.property(anyone, (who) => {
        expect(mayEmail("transactional", who)).toBe(true);
      }),
    );
  });

  it("sends a reminder only to an account that has not turned them off", () => {
    fc.assert(
      fc.property(anyone, (who) => {
        expect(mayEmail("reminder", who)).toBe(who?.reminders === true);
      }),
    );
  });

  it("sends news only to an account that said yes, never to an address with no account", () => {
    fc.assert(
      fc.property(anyone, (who) => {
        expect(mayEmail("news", who)).toBe(who?.news === true);
      }),
    );
    expect(mayEmail("news", null)).toBe(false);
  });

  it("sends billing mail to anyone who has not asked to stop it, account or not", () => {
    fc.assert(
      fc.property(anyone, (who) => {
        expect(mayEmail("billing", who)).toBe(true);
        expect(mayEmail("billing", who, false)).toBe(true);
      }),
    );
  });

  it("never sends billing mail to an address that asked to stop it, whatever its preferences", () => {
    fc.assert(
      fc.property(anyone, (who) => {
        expect(mayEmail("billing", who, true)).toBe(false);
      }),
    );
  });

  it("lets a stopped billing address change nothing about the other categories", () => {
    fc.assert(
      fc.property(anyone, fc.constantFrom("transactional", "reminder", "news"), (who, category) => {
        expect(mayEmail(category, who, true)).toBe(mayEmail(category, who, false));
      }),
    );
  });

  it("does not make a choice for a new account beyond reminders on and news off", () => {
    const fresh: EmailPreferences = defaultEmailPreferences;
    expect(emailCategories.map((category) => mayEmail(category, fresh))).toEqual([
      true,
      true,
      false,
      true,
    ]);
  });

  it("lets a stricter choice only remove what a looser one allowed", () => {
    fc.assert(
      fc.property(preferences, fc.constantFrom(...emailCategories), (who, category) => {
        const stricter = { reminders: false, news: false };
        expect(
          !mayEmail(category, stricter) ||
            mayEmail(category, who) ||
            category === "transactional" ||
            category === "billing",
        ).toBe(true);
        if (mayEmail(category, stricter)) {
          expect(["transactional", "billing"]).toContain(category);
        }
      }),
    );
  });
});
