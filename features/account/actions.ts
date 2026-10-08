"use server";

import { deleteAccount } from "@/lib/accounts/delete";
import { accountDeletionSteps } from "@/lib/accounts/deletion-steps";
import { saveTheme } from "@/lib/accounts/options";
import { actionFor } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { themes } from "@/lib/theme";
import { z } from "@/lib/validation";

/** Saves the theme in the person's options. The browser has already applied it and set the cookie. */
export const setTheme = actionFor("member")
  .inputSchema(z.object({ theme: z.enum(themes).nullable() }))
  .action(async ({ parsedInput, ctx }) => {
    await saveTheme(db, ctx.user.id, parsedInput.theme);
    return { theme: parsedInput.theme };
  });

/** Deletes the signed-in person's own account. The screen that calls it leaves the signed-in area. */
export const deleteOwnAccount = actionFor("member").action(async ({ ctx }) => {
  await deleteAccount(db, accountDeletionSteps, { userId: ctx.user.id, requestedBy: "self" });
  return { deleted: true };
});
