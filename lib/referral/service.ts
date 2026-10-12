import { count, eq } from "drizzle-orm";
import { type ReferralVerdict, readReferralCode, referralVerdict } from "@/domain/referral/rules";
import type { Database } from "@/lib/db/database";
import { referrals } from "@/lib/db/schema/referrals";
import { users } from "@/lib/db/schema/users";

/*
 * Who invited whom, against the database. The code arrives from a cookie, which a visitor can edit,
 * so nothing is trusted: the code is read strictly, looked up, and weighed by the rules. Anything
 * that is not a clean invitation is answered and forgotten; it never blocks signing in.
 */

export type ReferralOutcome = ReferralVerdict | "no_code";

export async function recordReferral(
  db: Database,
  input: { referredId: string; rawCode: string | null | undefined; now: Date },
): Promise<ReferralOutcome> {
  const code = readReferralCode(input.rawCode);
  if (code === null) {
    return "no_code";
  }
  const [referrer] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.referralCode, code));
  const [referred] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, input.referredId));
  const [already] = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(eq(referrals.referredId, input.referredId));
  if (referred === undefined) {
    return "unknown_code";
  }
  const verdict = referralVerdict({
    referrerId: referrer?.id ?? null,
    referredId: input.referredId,
    referredCreatedAt: referred.createdAt,
    alreadyInvited: already !== undefined,
    now: input.now,
  });
  if (verdict === "counts" && referrer !== undefined) {
    // Two sign-ins racing past the check are one invitation: the second insert finds the first.
    await db
      .insert(referrals)
      .values({
        referredId: input.referredId,
        referrerId: referrer.id,
        referrerEmail: referrer.email,
      })
      .onConflictDoNothing({ target: referrals.referredId });
  }
  return verdict;
}

/** The same, for the sign-up form, which knows the e-mail of the account it just made and not its id. */
export async function recordReferralForEmail(
  db: Database,
  input: { email: string; rawCode: string | null | undefined; now: Date },
): Promise<ReferralOutcome> {
  const [created] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()));
  return created === undefined
    ? "no_code"
    : recordReferral(db, { referredId: created.id, rawCode: input.rawCode, now: input.now });
}

/** What the person's page shows: their own code and how many people it has brought. */
export async function referralSummary(
  db: Database,
  userId: string,
): Promise<{ code: string; invited: number }> {
  const [owner] = await db
    .select({ code: users.referralCode })
    .from(users)
    .where(eq(users.id, userId));
  const [total] = await db
    .select({ invited: count() })
    .from(referrals)
    .where(eq(referrals.referrerId, userId));
  return { code: owner?.code ?? "", invited: total?.invited ?? 0 };
}
