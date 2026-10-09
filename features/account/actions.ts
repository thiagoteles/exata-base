"use server";

import { cookies } from "next/headers";
import { deleteAccount } from "@/lib/accounts/delete";
import { accountDeletionSteps } from "@/lib/accounts/deletion-steps";
import { actionFor } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { preferenceKeys } from "@/lib/preferences/definitions";
import { cookieFor } from "@/lib/preferences/resolve";
import { savePreference } from "@/lib/preferences/service";
import { ONE_YEAR_SECONDS } from "@/lib/theme";
import { z } from "@/lib/validation";

/**
 * Saves one preference of the signed-in person, whichever it is: the registry says what is valid,
 * and a value that does not fit is refused. When the page needs the value before it paints, the
 * cookie that carries it is written here too (the browser may already have applied it).
 */
export const saveOption = actionFor("member")
  .inputSchema(z.object({ key: z.enum(preferenceKeys), value: z.unknown() }))
  .metadata({ name: "saveOption" })
  .action(async ({ parsedInput, ctx }) => {
    const value = await savePreference(db, ctx.user.id, parsedInput.key, parsedInput.value);
    const change = cookieFor(parsedInput.key, value);
    if (change !== null) {
      const jar = await cookies();
      if (change.value === null) {
        jar.delete(change.name);
      } else {
        jar.set(change.name, change.value, {
          path: "/",
          maxAge: ONE_YEAR_SECONDS,
          sameSite: "lax",
        });
      }
    }
    return { key: parsedInput.key, value };
  });

/** Deletes the signed-in person's own account. The screen that calls it leaves the signed-in area. */
export const deleteOwnAccount = actionFor("member")
  .metadata({ name: "deleteOwnAccount" })
  .action(async ({ ctx }) => {
    await deleteAccount(db, accountDeletionSteps, { userId: ctx.user.id, requestedBy: "self" });
    return { deleted: true };
  });
