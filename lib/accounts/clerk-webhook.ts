import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { clerkEvents } from "@/lib/db/schema/auth";
import { users } from "@/lib/db/schema/users";
import type { ClerkProfile } from "./clerk-sync";
import { upsertClerkUser } from "./clerk-sync";
import { type DeletionSteps, deleteAccount } from "./delete";

export type ClerkEvent =
  | { type: "user.created" | "user.updated"; id: string; profile: ClerkProfile }
  | { type: "user.deleted"; id: string; clerkId: string }
  | { type: "ignored"; id: string };

/*
 * A Clerk delivery is processed once. The event id is the replay lock: a delivery whose id is
 * already stored is acknowledged without touching anything. Every operation here is idempotent
 * too, so two deliveries racing past the lock still leave the same result.
 */
export async function processClerkEvent(
  db: Database,
  event: ClerkEvent,
  deps: { adminEmails: readonly string[]; deletion: DeletionSteps; now: Date },
): Promise<"processed" | "duplicate"> {
  const [seen] = await db
    .select({ id: clerkEvents.id })
    .from(clerkEvents)
    .where(eq(clerkEvents.id, event.id));
  if (seen !== undefined) {
    return "duplicate";
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    await upsertClerkUser(db, event.profile, deps.adminEmails, deps.now);
  } else if (event.type === "user.deleted") {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, event.clerkId));
    if (user !== undefined) {
      // The person is already gone from Clerk, so the provider step has nothing left to delete.
      const deletion = { ...deps.deletion, deleteProviderUser: () => Promise.resolve() };
      await deleteAccount(db, deletion, { userId: user.id, requestedBy: "admin" });
    }
  }

  await db.insert(clerkEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
  return "processed";
}
