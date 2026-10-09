import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { users } from "@/lib/db/schema/users";
import { applyConfirmedEmail } from "./confirmation";

export type ClerkProfile = { clerkId: string; email: string; name: string; image: string | null };

/*
 * The single upsert behind both Clerk paths: the webhook and the sign-in that arrives before it.
 * Idempotent by clerkId. A row with the same e-mail and no clerkId (the seed, or a project that
 * switched modes) is linked instead of duplicated.
 */
export async function upsertClerkUser(
  db: Database,
  profile: ClerkProfile,
  adminEmails: readonly string[],
  now: Date,
): Promise<string> {
  const email = profile.email.toLowerCase();
  const fields = { email, name: profile.name, image: profile.image, emailVerified: true };

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, profile.clerkId));
  if (existing !== undefined) {
    await db.update(users).set(fields).where(eq(users.id, existing.id));
    return existing.id;
  }

  const [created] = await db
    .insert(users)
    .values({ ...fields, clerkId: profile.clerkId })
    .onConflictDoUpdate({ target: users.email, set: { ...fields, clerkId: profile.clerkId } })
    .returning({ id: users.id });
  if (created === undefined) {
    throw new Error("Clerk user was not stored");
  }
  await applyConfirmedEmail(db, created.id, adminEmails, now);
  return created.id;
}
