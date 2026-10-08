import { hasRole, type Role } from "@/lib/accounts/roles";
import { DomainError } from "@/lib/errors";

export type AdminViewer = { id: string; role: Role };

/** Every read of the admin area asks for the viewer, so a page cannot forget the role check. */
export function assertAdmin(viewer: AdminViewer): void {
  if (!hasRole(viewer.role, "admin")) {
    throw new DomainError(403);
  }
}

export const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
