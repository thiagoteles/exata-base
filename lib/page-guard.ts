import { notFound, redirect } from "next/navigation";
import type { Role } from "@/lib/accounts/roles";
import { DomainError } from "@/lib/errors";
import { requireRole } from "@/lib/ports/auth";
import { signInRedirect } from "@/lib/routes";

/**
 * The guard for a page. A visitor who is not signed in is sent to sign-in and comes back here;
 * someone signed in without the role gets a plain "not found", so a restricted area does not
 * announce that it exists.
 */
export async function requirePageRole(minimum: Role, path: string) {
  try {
    return await requireRole(minimum);
  } catch (error) {
    if (error instanceof DomainError && error.status === 401) {
      redirect(signInRedirect(path, "") as never);
    }
    if (error instanceof DomainError && error.status === 403) {
      notFound();
    }
    throw error;
  }
}
