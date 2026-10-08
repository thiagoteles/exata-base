import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { accountDeletions } from "@/lib/db/schema/audit";
import { files } from "@/lib/db/schema/files";
import { users } from "@/lib/db/schema/users";
import type { Logger } from "@/lib/ports/log/types";
import type { FileStorage } from "@/lib/ports/storage/types";
import { assertNotLastAdmin } from "./role-change";

/*
 * Deleting an account, in order. First the subscription is canceled: if that fails nothing is
 * deleted. Then, in one transaction, the row and everything it owns go, authored rows keep the
 * author's e-mail, and the trail is written. Last come the steps outside the database, the stored
 * files and the auth provider's user, whose failures are logged without undoing the deletion.
 */

export type DeletionSteps = {
  cancelBilling: (userId: string) => Promise<void>;
  storage: () => Promise<FileStorage>;
  deleteProviderUser: (clerkId: string) => Promise<void>;
  logger: Logger;
};

export type DeletionRequest = {
  userId: string;
  requestedBy: "self" | "admin";
  requestedByEmail?: string | null;
};

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex");
}

/** Resolves to false when there was no such account, which makes a repeated request harmless. */
export async function deleteAccount(
  db: Database,
  steps: DeletionSteps,
  request: DeletionRequest,
): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, request.userId));
  if (user === undefined) {
    return false;
  }

  await steps.cancelBilling(user.id);

  const storageKeys = await db.transaction(async (tx) => {
    if (user.role === "admin") {
      await assertNotLastAdmin(tx, user.id);
    }
    const owned = await tx
      .select({ key: files.storageKey })
      .from(files)
      .where(eq(files.ownerId, user.id));
    await tx.insert(accountDeletions).values({
      formerUserId: user.id,
      emailHash: hashEmail(user.email),
      requestedBy: request.requestedBy,
      requestedByEmail: request.requestedByEmail ?? null,
    });
    await tx.delete(users).where(eq(users.id, user.id));
    return owned.map(({ key }) => key);
  });

  const storage = await steps.storage();
  await Promise.all(
    storageKeys.map((key) =>
      storage.remove(key).catch((error: unknown) => {
        steps.logger.error("stored file not removed after account deletion", {
          storageKey: key,
          error,
        });
      }),
    ),
  );

  if (user.clerkId !== null) {
    await steps.deleteProviderUser(user.clerkId).catch((error: unknown) => {
      steps.logger.error("auth provider user not deleted", { clerkId: user.clerkId, error });
    });
  }
  return true;
}
