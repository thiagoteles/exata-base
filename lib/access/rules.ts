import { type Column, eq, type SQL } from "drizzle-orm";
import { hasRole, type Role } from "@/lib/accounts/roles";
import { DomainError } from "@/lib/errors";

/*
 * Who sees which record, decided the same way in every area: a person sees what their account
 * owns; the team sees everyone's, and only the team. A read takes the viewer and a scope, so a
 * page cannot forget to filter, and a scope the viewer may not use is refused, not emptied.
 */

export type Viewer = { id: string; role: Role };

/** `mine` is the viewer's own records; `all` is every account's and needs the staff role. */
export type Scope = "mine" | "all";

/** The filter of a read: the owner column for `mine`, nothing for the team, 403 for anyone else. */
export function visibleTo(viewer: Viewer, scope: Scope, owner: Column): SQL | undefined {
  if (scope === "mine") {
    return eq(owner, viewer.id);
  }
  if (!hasRole(viewer.role, "staff")) {
    throw new DomainError(403);
  }
  return undefined;
}

const recordId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An address that is not an id names no record; it must not reach the database as a bad cast. */
export const isRecordId = (value: string): boolean => recordId.test(value);
