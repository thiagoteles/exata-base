"use server";

import { deleteAccount } from "@/lib/accounts/delete";
import { accountDeletionSteps } from "@/lib/accounts/deletion-steps";
import { actionFor } from "@/lib/actions/client";
import { db } from "@/lib/db/client";

/** Deletes the signed-in person's own account. The screen that calls it leaves the signed-in area. */
export const deleteOwnAccount = actionFor("member")
  .metadata({ name: "deleteOwnAccount" })
  .action(async ({ ctx }) => {
    await deleteAccount(db, accountDeletionSteps, { userId: ctx.user.id, requestedBy: "self" });
    return { deleted: true };
  });
