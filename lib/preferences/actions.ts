"use server";

import { cookies } from "next/headers";
import { actionFor, limitedPublicAction } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { DomainError } from "@/lib/errors";
import { readCurrentUser } from "@/lib/ports/auth";
import { ONE_YEAR_SECONDS } from "@/lib/theme";
import { z } from "@/lib/validation";
import { claimVisitorValues } from "./claim";
import { browserPreferenceKeys, preferenceKeys } from "./definitions";
import { cookieFor, parsePreference } from "./resolve";
import { savePreference } from "./service";

/*
 * The actions every area that keeps a preference or a draft shares, so a feature calls them
 * without importing another feature.
 */

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
    if (user === null && browserPreferenceKeys.includes(parsedInput.key)) {
      // A visitor keeps these in the browser's own storage, and the server has nowhere to put them.
      throw new DomainError(400);
    }
    const value =
      user === null
        ? parsePreference(parsedInput.key, parsedInput.value)
        : await savePreference(db, user.id, parsedInput.key, parsedInput.value);
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

const MAX_CLAIMED = 20;

/**
 * Hands the account what this browser kept for a visitor (see `lib/browser-storage.ts`). It answers
 * with every key it handled, saved or not, so the page can wipe them from the browser.
 */
export const claimVisitorData = actionFor("member")
  .inputSchema(z.object({ values: z.record(z.string(), z.unknown()) }))
  .metadata({ name: "claimVisitorData" })
  .action(async ({ parsedInput, ctx }) => {
    if (Object.keys(parsedInput.values).length > MAX_CLAIMED) {
      throw new DomainError(400);
    }
    return { handled: await claimVisitorValues(db, ctx.user.id, parsedInput.values) };
  });
