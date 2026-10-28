import { describe, expect, it } from "vitest";
import {
  groupNav,
  type NavItem,
  type NavLayout,
  navBar,
  navKeys,
  navSections,
  splitForBar,
  visibleNav,
} from "./navigation";
import { productNavLayout } from "./navigation.product";

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

const keysOf = (sections: { key: string; items: NavItem[] }[]) =>
  sections.map((section) => [section.key, section.items.map((entry) => entry.key)]);

// The base's own destinations, so these hold in every product whatever its items are.
const layout: NavLayout = {
  sections: [
    { key: "top", labelled: false, items: ["account"] },
    { key: "tools", labelled: true, items: ["plan", "admin", "numbers"] },
  ],
  bar: ["plan", "account"],
};

describe("a product's layout", () => {
  it("leaves the menu as the base's groups when the product has none", () => {
    expect(keysOf(navSections("admin", null))).toEqual(
      keysOf(groupNav(visibleNav("admin")).map(({ group, items }) => ({ key: group, items }))),
    );
    expect(navBar("member", null)).toEqual(splitForBar(visibleNav("member")));
  });

  it("shows only what its sections name, in their order, with the hub where it is named", () => {
    expect(keysOf(navSections("admin", layout))).toEqual([
      ["top", ["account"]],
      ["tools", ["plan", "admin", "numbers"]],
    ]);
  });

  it("still hides from a member what a member may not open, the hub included", () => {
    expect(keysOf(navSections("member", layout))).toEqual([
      ["top", ["account"]],
      ["tools", ["plan"]],
    ]);
  });

  it("keeps its own destinations in the bar, in its order, and the rest behind More", () => {
    const { bar, more } = navBar("admin", layout);
    expect(bar.map((entry) => entry.key)).toEqual(["plan", "account"]);
    expect(more.map((entry) => entry.key)).toEqual(["admin", "numbers"]);
  });

  it("may keep in the bar a destination the sidebar leaves out", () => {
    const { bar, more } = navBar("admin", { ...layout, bar: ["messages", "plan"] });
    expect(bar.map((entry) => entry.key)).toEqual(["messages", "plan"]);
    expect(more.map((entry) => entry.key)).toEqual(["account", "admin", "numbers"]);
  });

  // A misspelt key would hide a destination without a word; this names it instead.
  it("names only destinations that exist", () => {
    const named = [
      ...(productNavLayout?.sections.flatMap((section) => section.items) ?? []),
      ...(productNavLayout?.bar ?? []),
    ];
    expect(named.filter((key) => !navKeys.has(key))).toEqual([]);
  });
});
