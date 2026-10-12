import type { userRole } from "@/lib/db/schema/users";

export type Role = (typeof userRole.enumValues)[number];

const rank: Readonly<Record<Role, number>> = { member: 0, staff: 1, admin: 2 };

/** True when `role` is at least `minimum`: an admin passes a staff guard, a member does not. */
export function hasRole(role: Role, minimum: Role): boolean {
  return rank[role] >= rank[minimum];
}

/** The higher of two roles. Promotion never demotes. */
export function higherRole(a: Role, b: Role): Role {
  return rank[a] >= rank[b] ? a : b;
}
