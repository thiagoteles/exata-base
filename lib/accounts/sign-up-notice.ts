import { count, eq } from "drizzle-orm";
import { signUpNoticeMessage } from "@/emails/sign-up-emails";
import { formatInstantDate } from "@/lib/date";
import type { Database } from "@/lib/db/database";
import { users } from "@/lib/db/schema/users";
import { env } from "@/lib/env";
import { defaultLocale, timeZone } from "@/lib/i18n/locales";
import { sendEmail } from "@/lib/ports/email";
import { emailTranslatorFor, renderEmail } from "@/lib/ports/email/render";
import type { SendResult } from "@/lib/ports/email/types";

const hour = new Intl.DateTimeFormat(defaultLocale, {
  timeZone,
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Tells the admins (ADMIN_EMAILS) that an account was just made: who, when in the product's zone,
 * how many accounts there are now, and the link to it in the admin. It is the team's own notice, so
 * it is transactional and goes whatever the admins chose for reminders. With no admin addresses, or
 * an account that is already gone, nobody is written to and the answer is null.
 */
export async function notifyAdminsOfSignUp(
  db: Database,
  accountId: string,
  recipients: readonly string[] = env.ADMIN_EMAILS,
): Promise<SendResult | null> {
  if (recipients.length === 0) {
    return null;
  }
  const [[account], [all]] = await Promise.all([
    db
      .select({ name: users.name, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, accountId)),
    db.select({ total: count() }).from(users),
  ]);
  if (account === undefined) {
    return null;
  }
  const { subject, element } = signUpNoticeMessage(
    {
      name: account.name,
      email: account.email,
      date: formatInstantDate(account.createdAt),
      time: hour.format(account.createdAt),
      total: all?.total ?? 1,
      url: new URL(`/admin/users/${accountId}`, env.APP_URL).toString(),
    },
    await emailTranslatorFor(defaultLocale),
  );
  const { html, text } = await renderEmail(element);
  return sendEmail({ to: recipients, category: "transactional", subject, html, text });
}
