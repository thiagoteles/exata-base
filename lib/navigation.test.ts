import { describe, expect, it } from "vitest";
import { groupNav, type NavItem, splitForBar, visibleNav } from "./navigation";

const item = (key: string, group: NavItem["group"], minimum: NavItem["minimum"]): NavItem => ({
  key,
  href: "/account",
  group,
  minimum,
  icon: "user",
});

describe("navigation", () => {
  it("shows a member only the member destinations", () => {
    expect(visibleNav("member").every((entry) => entry.minimum === "member")).toBe(true);
  });

  it("groups destinations in a fixed order and drops empty groups", () => {
    const items = [
      item("a", "admin", "admin"),
      item("b", "main", "member"),
      item("c", "staff", "staff"),
    ];
    expect(groupNav(items).map((entry) => entry.group)).toEqual(["main", "staff", "admin"]);
    expect(groupNav([item("b", "main", "member")]).map((entry) => entry.group)).toEqual(["main"]);
  });

  it("keeps up to four destinations in the bar, and folds the rest behind More", () => {
    const four = ["a", "b", "c", "d"].map((key) => item(key, "main", "member"));
    expect(splitForBar(four)).toEqual({ bar: four, more: [] });
    const six = [...four, item("e", "main", "member"), item("f", "main", "member")];
    const { bar, more } = splitForBar(six);
    expect(bar).toHaveLength(3);
    expect(more.map((entry) => entry.key)).toEqual(["d", "e", "f"]);
  });
});
