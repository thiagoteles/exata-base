import { describe, expect, it } from "vitest";
import { isCurrent } from "./active-path";

describe("current destination", () => {
  it("matches the page itself and the pages under it, and nothing that only shares a prefix", () => {
    expect(isCurrent("/account", "/account")).toBe(true);
    expect(isCurrent("/account/plan", "/account")).toBe(true);
    expect(isCurrent("/accounts", "/account")).toBe(false);
    expect(isCurrent("/", "/account")).toBe(false);
  });
});
