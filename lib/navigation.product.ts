import type { Route } from "next";
import type { Role } from "@/lib/accounts/roles";

/*
 * The product's own destinations in the signed-in area, shown before the base's, and the icons
 * they add. The product owns this file; the base ships it with its samples. An icon named here is
 * drawn by the shell's product icon map.
 */

export const productNavIconNames = [] as const;

type ProductNavItem = {
  key: string;
  href: Route;
  group: "main" | "staff" | "admin";
  minimum: Role;
  icon: string;
  exact?: boolean;
};

export const productNavItems = [
  { key: "sampleItems", href: "/sample-items", group: "main", minimum: "member", icon: "folder" },
  { key: "sampleParts", href: "/sample-parts", group: "main", minimum: "member", icon: "folder" },
] as const satisfies readonly ProductNavItem[];
