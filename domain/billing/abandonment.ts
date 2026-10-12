/*
 * When an abandoned checkout deserves one reminder. A checkout that expired unpaid, recently enough that
 * the person remembers it, and not yet reminded. A reminder about something from last month is noise.
 */

const DAY_MS = 86_400_000;

/** How long after a checkout expired a reminder still makes sense. */
export const REMINDER_WINDOW_DAYS = 7;

export type AbandonedCheckout = {
  status: string;
  closedAt: Date | null;
  remindedAt: Date | null;
};

export function worthReminding(checkout: AbandonedCheckout, now: Date): boolean {
  if (checkout.status !== "expired" || checkout.remindedAt !== null || checkout.closedAt === null) {
    return false;
  }
  const age = now.getTime() - checkout.closedAt.getTime();
  return age >= 0 && age <= REMINDER_WINDOW_DAYS * DAY_MS;
}
