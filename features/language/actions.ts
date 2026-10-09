"use server";

import { cookies } from "next/headers";
import { publicAction } from "@/lib/actions/client";
import { db } from "@/lib/db/client";
import { LOCALE_COOKIE, locales } from "@/lib/i18n/locales";
import { readCurrentUser } from "@/lib/ports/auth";
import { savePreference } from "@/lib/preferences/service";
import { z } from "@/lib/validation";

const ONE_YEAR_SECONDS = 31_536_000;

/**
 * Remembers the language: in the cookie the proxy reads, and, for a signed-in person, in their
 * options so it follows them to another browser. A visitor is welcome to choose too.
 */
export const setLanguage = publicAction
  .inputSchema(z.object({ locale: z.enum(locales) }))
  .metadata({ name: "setLanguage" })
  .action(async ({ parsedInput }) => {
    (await cookies()).set(LOCALE_COOKIE, parsedInput.locale, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    });
    const user = await readCurrentUser();
    if (user !== null) {
      await savePreference(db, user.id, "locale", parsedInput.locale);
    }
    return { locale: parsedInput.locale };
  });
