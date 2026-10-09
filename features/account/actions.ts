"use server";

import { cookies } from "next/headers";
import { deleteAccount } from "@/lib/accounts/delete";
import { accountDeletionSteps } from "@/lib/accounts/deletion-steps";
import { actionFor, limitedPublicAction } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { readCurrentUser } from "@/lib/ports/auth";
import { preferenceKeys } from "@/lib/preferences/definitions";
import { cookieFor, parsePreference } from "@/lib/preferences/resolve";
import { savePreference } from "@/lib/preferences/service";
import { ONE_YEAR_SECONDS } from "@/lib/theme";
import { z } from "@/lib/validation";

/**
 * Remembers one preference, whichever it is, for a visitor or a signed-in person: the registry says
 * what is valid and a value that does not fit is refused. It always goes to the browser's cookie,
 * which is how a visitor keeps it and how the first paint reads it; a signed-in person also gets it
 * saved to the account, so it follows them to another browser. The browser may already have applied
 * it, so the answer only confirms. Counted by address, like any public action.
 */
export const rememberOption = limitedPublicAction({
  name: "preference",
  limit: 240,
  windowSeconds: 3600,
})
  .inputSchema(z.object({ key: z.enum(preferenceKeys), value: z.unknown() }))
  .metadata({ name: "rememberOption" })
  .action(async ({ parsedInput }) => {
    const user = await readCurrentUser();
    const value =
      user === null
        ? parsePreference(parsedInput.key, parsedInput.value)
        : await savePreference(db, user.id, parsedInput.key, parsedInput.value);
    const change = cookieFor(parsedInput.key, value);
    const jar = await cookies();
    if (change.value === null) {
      jar.delete(change.name);
    } else {
      jar.set(change.name, change.value, { path: "/", maxAge: ONE_YEAR_SECONDS, sameSite: "lax" });
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
