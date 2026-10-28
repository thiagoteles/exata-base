import type { Route } from "next";
import { hasRole, type Role } from "@/lib/accounts/roles";
import { type productNavIconNames, productNavItems, productNavLayout } from "./navigation.product";

/*
 * Every destination of the signed-in area, with the lowest role that sees it. The sidebar and the
 * bottom bar both read this list. The product's destinations come first, from its own file, where a
 * new page of the product is added. A page adds its own entry when it exists: there is no entry for
 * a screen that is not built yet.
 */

export type NavGroup = "main" | "staff" | "admin";
/** The icons a destination may carry. The shell draws each one, and the compiler refuses one it does not. */
const navIconNames = [
  "user",
  "mail",
  "inbox",
  "card",
  "users",
  "send",
  "history",
  "chart",
  "pulse",
  "folder",
  "gift",
  "shield",
] as const;
export type NavIcon = (typeof navIconNames)[number] | (typeof productNavIconNames)[number];

export type NavItem = {
  key: string;
  href: Route;
  group: NavGroup;
  minimum: Role;
  icon: NavIcon;
  /** Current only on its own page, for a destination whose neighbours live under its path. */
  exact?: boolean;
};

const navItems: readonly NavItem[] = [
  ...productNavItems,
  { key: "account", href: "/account", group: "main", minimum: "member", icon: "user", exact: true },
  { key: "plan", href: "/account/plan", group: "main", minimum: "member", icon: "card" },
  { key: "messages", href: "/account/messages", group: "main", minimum: "member", icon: "mail" },
  { key: "contacts", href: "/staff/contacts", group: "staff", minimum: "staff", icon: "inbox" },
  { key: "numbers", href: "/admin/numbers", group: "admin", minimum: "admin", icon: "chart" },
  { key: "health", href: "/admin/health", group: "admin", minimum: "admin", icon: "pulse" },
  { key: "users", href: "/admin/users", group: "admin", minimum: "admin", icon: "users" },
  { key: "referrals", href: "/admin/referrals", group: "admin", minimum: "admin", icon: "gift" },
  { key: "invites", href: "/admin/invites", group: "admin", minimum: "admin", icon: "send" },
  { key: "audit", href: "/admin/audit", group: "admin", minimum: "admin", icon: "history" },
];

/*
 * The way into every staff and admin screen at once, for a product that keeps them out of its menu.
 * It is never in the menu on its own: only a product layout that names it shows it.
 */
const hubItem: NavItem = {
  key: "admin",
  href: "/admin",
  group: "staff",
  minimum: "staff",
  icon: "shield",
};

/**
 * A product that arranges the menu itself: its sections in order, each naming the destinations it
 * holds by key (the product's and the base's alike, and `admin` for the hub), and the destinations
 * the bottom bar always shows. A destination no section names is not in the menu. Without a layout
 * the menu is the base's: the groups below, and the bar filled in order.
 */
export type NavLayout = {
  sections: readonly { key: string; labelled: boolean; items: readonly string[] }[];
  bar: readonly string[];
};

export type NavSection = { key: string; labelled: boolean; items: NavItem[] };

const groupOrder: readonly NavGroup[] = ["main", "staff", "admin"];

export function visibleNav(role: Role): NavItem[] {
  return navItems.filter((item) => hasRole(role, item.minimum));
}

/** Items in their groups, in the order the sidebar shows them. Empty groups are left out. */
export function groupNav(items: readonly NavItem[]): { group: NavGroup; items: NavItem[] }[] {
  return groupOrder
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0);
}

/** The staff and admin screens a role sees, which the hub lists. */
export function staffDestinations(role: Role): NavItem[] {
  return visibleNav(role).filter((item) => item.group !== "main");
}

/** Every key a layout may name: each destination and the hub. */
export const navKeys: ReadonlySet<string> = new Set([...navItems, hubItem].map((item) => item.key));

/** The menu's sections for a role: the product's layout when it has one, the base's groups when not. */
export function navSections(role: Role, layout: NavLayout | null = productNavLayout): NavSection[] {
  if (layout === null) {
    return groupNav(visibleNav(role)).map(({ group, items }) => ({
      key: group,
      labelled: true,
      items,
    }));
  }
  const reachable = new Map(
    [...visibleNav(role), hubItem]
      .filter((item) => hasRole(role, item.minimum))
      .map((item) => [item.key, item]),
  );
  return layout.sections
    .map((section) => ({
      key: section.key,
      labelled: section.labelled,
      items: section.items.flatMap((key) => reachable.get(key) ?? []),
    }))
    .filter((section) => section.items.length > 0);
}

/** The bottom bar for a role: the layout's own slots and the rest behind More, or the base's split. */
export function navBar(
  role: Role,
  layout: NavLayout | null = productNavLayout,
): { bar: NavItem[]; more: NavItem[] } {
  if (layout === null) {
    return splitForBar(visibleNav(role));
  }
  const all = navSections(role, layout).flatMap((section) => section.items);
  const bar = layout.bar.flatMap((key) => all.find((item) => item.key === key) ?? []);
  return { bar, more: all.filter((item) => !bar.includes(item)) };
}

/** The bottom bar holds at most this many destinations; the rest go into the sheet behind "More". */
const BAR_SLOTS = 4;

export function splitForBar(items: readonly NavItem[]): { bar: NavItem[]; more: NavItem[] } {
  if (items.length <= BAR_SLOTS) {
    return { bar: [...items], more: [] };
  }
  return { bar: items.slice(0, BAR_SLOTS - 1), more: items.slice(BAR_SLOTS - 1) };
}
