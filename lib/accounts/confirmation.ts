import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { invites } from "@/lib/db/schema/invites";
import { users } from "@/lib/db/schema/users";
import { higherRole, type Role } from "./roles";

/*
 * Runs once an account's e-mail is known to belong to the person: after confirmation in local
 * mode, and when the row is created in Clerk mode, where every e-mail is already verified.
 * ADMIN_EMAILS and a pending invite can only raise the role, never lower it.
 */
export async function applyConfirmedEmail(
  db: Database,
  userId: string,
  adminEmails: readonly string[],
  now: Date = new Date(),
): Promise<void> {
  await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (user === undefined) {
      return;
    }

    const [invite] = await tx
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.email, user.email),
          isNull(invites.acceptedAt),
          isNull(invites.revokedAt),
          gt(invites.expiresAt, now),
        ),
      )
      .orderBy(invites.createdAt)
      .limit(1)
      .for("update");

    let role: Role = user.role;
    if (adminEmails.includes(user.email)) {
      role = higherRole(role, "admin");
    }
    if (invite !== undefined) {
      role = higherRole(role, invite.role);
      await tx.update(invites).set({ acceptedAt: now }).where(eq(invites.id, invite.id));
    }
    if (role !== user.role) {
      await tx.update(users).set({ role }).where(eq(users.id, user.id));
    }
  });
}
