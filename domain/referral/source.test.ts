import { describe, expect, it } from "vitest";
import { readReferralCookie, referralCookieValue, referralVerdict } from "./rules";

const DAY = 86_400_000;
const now = new Date("2026-10-09T12:00:00Z");
const arrival = (daysAgo: number) => ({
  referrerId: "ana",
  referredId: "bia",
  referredCreatedAt: new Date(now.getTime() - daysAgo * DAY),
  alreadyInvited: false,
  now,
  windowDays: 60,
});

describe("a product's own window for an invitation", () => {
  // Fails when the window is fixed at the base's seven days whatever the product set.
  it("counts a sign-in within its days and not after", () => {
    expect(referralVerdict(arrival(59))).toBe("counts");
    expect(referralVerdict(arrival(61))).toBe("too_late");
  });
});

describe("the place a link was shared from", () => {
  const sources = ["newsletter"];

  it("travels with the code in the cookie and comes back out of it", () => {
    const value = referralCookieValue("abcdef012345", "newsletter");
    expect(readReferralCookie(value, sources)).toEqual({
      code: "abcdef012345",
      source: "newsletter",
    });
    expect(readReferralCookie("abcdef012345", sources)).toEqual({
      code: "abcdef012345",
      source: null,
    });
  });

  // Fails when a visitor's edited cookie records a place the product never listed.
  it("is dropped when the product does not list it, and the code still counts", () => {
    expect(readReferralCookie("abcdef012345:elsewhere", sources)).toEqual({
      code: "abcdef012345",
      source: null,
    });
    expect(readReferralCookie("not-a-code:newsletter", sources)).toBeNull();
  });
});
