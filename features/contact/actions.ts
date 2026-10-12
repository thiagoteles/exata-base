"use server";

import { getTranslations } from "next-intl/server";
import { currentInstant } from "@/domain/clock";
import { actionFor, limitedPublicAction } from "@/lib/actions/client";
import { notifyTeam, sendReply } from "@/lib/contact/mailer";
import { contactStatuses } from "@/lib/contact/options";
import { changeContactStatus, replyToContact, submitContact } from "@/lib/contact/service";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { defaultLocale } from "@/lib/i18n/locales";
import { readCurrentUser } from "@/lib/ports/auth";
import { chooseLocale, requestLocale } from "@/lib/ports/email/locale";
import { savedLocaleOfUser, savePreference } from "@/lib/preferences/service";
import { z } from "@/lib/validation";
import { contactSchema, replySchema } from "./schema";

/** The public form. A signed-in person is recognized; a visitor is welcome too. */
export const sendContact = limitedPublicAction({ name: "contact", limit: 20, windowSeconds: 3600 })
  .inputSchema(contactSchema)
  .metadata({ name: "sendContact" })
  .action(async ({ parsedInput }) => {
    const [t, user, locale] = await Promise.all([
      getTranslations("contact"),
      readCurrentUser(),
      requestLocale(),
    ]);
    await submitContact(
      db,
      { ...parsedInput, locale },
      user === null ? null : { id: user.id, email: user.email },
      (row) => notifyTeam(row, { subject: t(`subjects.${row.subject}`) }, env.CONTACT_EMAIL),
    );
    // The draft this message came from is spent. Clearing it here, with the send, means it cannot
    // survive a page that leaves before the browser's own call to clear it gets through.
    if (user !== null) {
      await savePreference(db, user.id, "contactDraft", null);
    }
    return { sent: true };
  });

export const setContactStatus = actionFor("staff")
  .inputSchema(z.object({ id: z.uuid(), status: z.enum(contactStatuses) }))
  .metadata({ name: "setContactStatus" })
  .action(async ({ parsedInput, ctx }) => {
    await changeContactStatus(
      db,
      { id: ctx.user.id, email: ctx.user.email },
      parsedInput.id,
      parsedInput.status,
    );
    return { status: parsedInput.status };
  });

export const answerContact = actionFor("staff")
  .inputSchema(replySchema)
  .metadata({ name: "answerContact" })
  .action(async ({ parsedInput, ctx }) => {
    await replyToContact({
      db,
      actor: { id: ctx.user.id, email: ctx.user.email },
      id: parsedInput.id,
      body: parsedInput.body,
      send: async (message, body) => {
        // The account's saved language wins; otherwise the one the sender was writing in.
        const saved = message.userId === null ? null : await savedLocaleOfUser(db, message.userId);
        return sendReply(
          message,
          body,
          env.CONTACT_EMAIL[0],
          chooseLocale(saved, chooseLocale(message.locale, defaultLocale)),
        );
      },
      now: currentInstant(),
    });
    return { answered: true };
  });
