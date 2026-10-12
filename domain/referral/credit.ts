/*
 * What an invitation is worth to the person who made it. The invited person paying for the first time
 * earns the inviter a credit, once. Nothing here reads the database or the clock: the caller says what
 * the referral and the payment look like.
 */

export type CreditCase = {
  /** The catalog's credit for an invitation, in cents. Zero or less means the program is off. */
  configuredCents: number;
  /** The inviter's account still exists: a credit has nobody to go to otherwise. */
  referrerId: string | null;
  referredId: string;
  /** When the inviter was already credited for this arrival, or null. */
  rewardedAt: Date | null;
  /** The invited person has a charge that went through and was not refunded in full. */
  referredHasPaid: boolean;
};

/** The credit to grant now, in cents, or 0. */
export function creditFor(input: CreditCase): number {
  const { configuredCents, referrerId, referredId, rewardedAt, referredHasPaid } = input;
  if (configuredCents <= 0 || rewardedAt !== null || !referredHasPaid) {
    return 0;
  }
  if (referrerId === null || referrerId === referredId) {
    return 0;
  }
  return Math.floor(configuredCents);
}
