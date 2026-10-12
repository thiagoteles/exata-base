import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { users } from "@/lib/db/schema/users";
import { DomainError } from "@/lib/errors";

/** The part of an account the API shows to its own holder. */
export async function readProfile(db: Database, userId: string) {
  const [profile] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, userId));
  if (profile === undefined) {
    throw new DomainError(404);
  }
  return profile;
}

/** Changes the name an account goes by, for the API's own holder. */
export async function renameProfile(db: Database, userId: string, name: string) {
  const [profile] = await db
    .update(users)
    .set({ name })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
  if (profile === undefined) {
    throw new DomainError(404);
  }
  return profile;
}
