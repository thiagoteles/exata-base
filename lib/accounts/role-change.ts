import { and, eq, ne } from "drizzle-orm";
import type { Database, Executor } from "@/lib/db/database";
import { users } from "@/lib/db/schema/users";
import { DomainError } from "@/lib/errors";
import type { Actor } from "./actor";
import { recordStaffWrite } from "./audit";
import type { Role } from "./roles";

/** Fails when removing `userId` from the admins would leave none. Run inside the transaction. */
export async function assertNotLastAdmin(tx: Executor, userId: string): Promise<void> {
  // Locking every admin row serializes concurrent demotions, so two cannot both pass.
  const admins = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .for("update");
  if (admins.length === 1 && admins[0]?.id === userId) {
    throw new DomainError(409, "conflict");
  }
}

export async function changeRole(
  db: Database,
  actor: Actor,
  userId: string,
  role: Role,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (target === undefined) {
      throw new DomainError(404);
    }
    if (target.role === role) {
      return;
    }
    if (target.role === "admin") {
      await assertNotLastAdmin(tx, userId);
    }
    await tx
      .update(users)
      .set({ role })
      .where(and(eq(users.id, userId), ne(users.role, role)));
    await recordStaffWrite(tx, actor, {
      action: "user.role.change",
      targetTable: "users",
      targetId: userId,
      details: { from: target.role, to: role },
    });
  });
}
