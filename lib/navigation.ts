import type { Route } from "next";
import { hasRole, type Role } from "@/lib/accounts/roles";

/*
 * Every destination of the signed-in area, with the lowest role that sees it. The sidebar and the
 * bottom bar both read this list, so a new page is added here and nowhere else. A page adds its
 * own entry when it exists: there is no entry for a screen that is not built yet.
 */

export type NavGroup = "main" | "staff" | "admin";
type NavIcon =
  | "user"
  | "mail"
  | "inbox"
  | "card"
  | "users"
  | "send"
  | "history"
  | "chart"
  | "pulse";

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
  { key: "account", href: "/account", group: "main", minimum: "member", icon: "user", exact: true },
  { key: "plan", href: "/account/plan", group: "main", minimum: "member", icon: "card" },
  { key: "messages", href: "/account/messages", group: "main", minimum: "member", icon: "mail" },
  { key: "contacts", href: "/staff/contacts", group: "staff", minimum: "staff", icon: "inbox" },
  { key: "numbers", href: "/admin/numbers", group: "admin", minimum: "admin", icon: "chart" },
  { key: "health", href: "/admin/health", group: "admin", minimum: "admin", icon: "pulse" },
  { key: "users", href: "/admin/users", group: "admin", minimum: "admin", icon: "users" },
  { key: "invites", href: "/admin/invites", group: "admin", minimum: "admin", icon: "send" },
  { key: "audit", href: "/admin/audit", group: "admin", minimum: "admin", icon: "history" },
];

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

/** The bottom bar holds at most this many destinations; the rest go into the sheet behind "More". */
const BAR_SLOTS = 4;

export function splitForBar(items: readonly NavItem[]): { bar: NavItem[]; more: NavItem[] } {
  if (items.length <= BAR_SLOTS) {
    return { bar: [...items], more: [] };
  }
  return { bar: items.slice(0, BAR_SLOTS - 1), more: items.slice(BAR_SLOTS - 1) };
}
