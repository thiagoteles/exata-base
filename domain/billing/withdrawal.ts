/*
 * The right of withdrawal of the Brazilian consumer code (CDC, art. 49): a purchase made away from
 * a shop may be cancelled within 7 days of it, with every amount paid returned. The period runs
 * from the payment, and the last moment is kept exact rather than rounded to a calendar day.
 */

const WITHDRAWAL_DAYS = 7;
const DAY_MS = 86_400_000;

export const withdrawalEndsAt = (paidAt: Date): Date =>
  new Date(paidAt.getTime() + WITHDRAWAL_DAYS * DAY_MS);

export const isWithinWithdrawal = (paidAt: Date, now: Date): boolean =>
  now.getTime() <= withdrawalEndsAt(paidAt).getTime();
