import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ATTRIBUTION_WINDOW_DAYS, readReferralCode, referralVerdict } from "./rules";

const DAY = 86_400_000;
const now = new Date("2026-10-09T12:00:00Z");
const base = {
  referrerId: "ana",
  referredId: "bia",
  referredCreatedAt: new Date(now.getTime() - DAY),
  alreadyInvited: false,
  now,
};

describe("reading a referral code", () => {
  it("takes twelve letters and digits in any case, and refuses anything else", () => {
    expect(readReferralCode("abcdef012345")).toBe("abcdef012345");
    expect(readReferralCode("  ABCDEF012345 ")).toBe("abcdef012345");
    for (const bad of [
      "",
      "short",
      "abcdef0123456",
      "abcdef01234!",
      "abcdef 01234",
      null,
      undefined,
    ]) {
      expect(readReferralCode(bad)).toBeNull();
    }
  });

  it("never returns something that is not a code, whatever it is given", () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        const code = readReferralCode(raw);
        expect(code === null || /^[a-z0-9]{12}$/.test(code)).toBe(true);
      }),
    );
  });
});

describe("who counts as invited", () => {
  it("counts a new arrival with a code that belongs to someone else", () => {
    expect(referralVerdict(base)).toBe("counts");
  });

  it("never counts a person for their own code, whatever else is true", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.boolean(), (id, alreadyInvited) => {
        expect(referralVerdict({ ...base, referrerId: id, referredId: id, alreadyInvited })).toBe(
          "own_code",
        );
      }),
    );
  });

  it("refuses a code nobody has, and a person who was already invited", () => {
    expect(referralVerdict({ ...base, referrerId: null })).toBe("unknown_code");
    expect(referralVerdict({ ...base, alreadyInvited: true })).toBe("already_invited");
  });

  it("counts up to the end of the window and not after it", () => {
    const at = (days: number, extra = 0) => ({
      ...base,
      referredCreatedAt: new Date(now.getTime() - days * DAY - extra),
    });
    expect(referralVerdict(at(ATTRIBUTION_WINDOW_DAYS))).toBe("counts");
    expect(referralVerdict(at(ATTRIBUTION_WINDOW_DAYS, 1))).toBe("too_late");
    expect(referralVerdict(at(365))).toBe("too_late");
  });

  it("counts an account made the moment before, even one whose clock is a little ahead", () => {
    expect(referralVerdict({ ...base, referredCreatedAt: new Date(now.getTime() + 5000) })).toBe(
      "counts",
    );
  });
});
