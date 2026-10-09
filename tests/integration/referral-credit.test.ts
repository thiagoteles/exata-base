import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { plans } from "@/lib/db/schema/billing";
import { referrals } from "@/lib/db/schema/referrals";
import type { PaymentGateway } from "@/lib/ports/payment/types";
import { earnedCredit, grantReferralCredits } from "@/lib/referral/credit";
import { recordReferral, referralSummary } from "@/lib/referral/service";
import { billingFixture } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser } from "./factories";
import { chargeRefunded, chargeSucceeded } from "./stripe-events";

const db = testDatabase();
const { deliver, subscriber } = billingFixture(db);
const now = new Date();

/** A provider that remembers each credit it was asked for and can be made to fail. */
function provider(options: { fail?: boolean } = {}) {
  const asked: { customerId: string | null; cents: number; currency: string; key: string }[] = [];
  const grantCredit = vi.fn(
    (request: {
      customerId: string | null;
      cents: number;
      currency: string;
      idempotencyKey: string;
    }) => {
      if (options.fail) {
        return Promise.reject(new Error("provider down"));
      }
      asked.push({
        customerId: request.customerId,
        cents: request.cents,
        currency: request.currency,
        key: request.idempotencyKey,
      });
      return Promise.resolve({ customerId: request.customerId ?? "cus_new" });
    },
  );
  return { asked, gateway: { grantCredit } as unknown as PaymentGateway };
}

async function invitedBy(inviterEmail: string, invitedEmail: string) {
  const inviter = await createUser(db, inviterEmail);
  const invited = await createUser(db, invitedEmail);
  const { code } = await referralSummary(db, inviter.id);
  await recordReferral(db, { referredId: invited.id, rawCode: code, now });
  return { inviter, invited };
}

async function pays(userId: string, charge: string, amount = 2900) {
  await db
    .update(plans)
    .set({ providerCustomerId: `cus_${userId}` })
    .where(eq(plans.userId, userId));
  await deliver(
    chargeSucceeded(`evt_${charge}`, { id: charge, customer: `cus_${userId}`, amount }),
  );
}

describe("the credit an invitation earns", () => {
  it("is granted to the inviter once the invited person has paid, and not before", async () => {
    const { inviter, invited } = await invitedBy("ana@example.com", "bia@example.com");
    const { asked, gateway } = provider();
    expect(await grantReferralCredits(db, gateway, { now })).toEqual({ granted: 0, failed: 0 });
    await pays(invited.id, "ch_1");
    expect(await grantReferralCredits(db, gateway, { now })).toEqual({ granted: 1, failed: 0 });
    expect(asked).toHaveLength(1);
    expect(asked[0]).toMatchObject({ cents: 1000, currency: "brl" });
    expect(await earnedCredit(db, inviter.id)).toBe(1000);
  });

  it("is granted once however many times it is tried, and under a key made from the invitation", async () => {
    const { invited } = await invitedBy("ana@example.com", "bia@example.com");
    await pays(invited.id, "ch_1");
    const { asked, gateway } = provider();
    await Promise.all([
      grantReferralCredits(db, gateway, { now }),
      grantReferralCredits(db, gateway, { now }),
      grantReferralCredits(db, gateway, { now, referredId: invited.id }),
    ]);
    expect(asked).toHaveLength(1);
    const [row] = await db.select().from(referrals);
    expect(asked[0]?.key).toBe(`referral-${row?.id}`);
    expect(await grantReferralCredits(db, gateway, { now })).toEqual({ granted: 0, failed: 0 });
  });

  it("gives the claim back when the provider fails, so the next call tries again", async () => {
    const { inviter, invited } = await invitedBy("ana@example.com", "bia@example.com");
    await pays(invited.id, "ch_1");
    expect(await grantReferralCredits(db, provider({ fail: true }).gateway, { now })).toEqual({
      granted: 0,
      failed: 1,
    });
    expect(await earnedCredit(db, inviter.id)).toBe(0);
    expect(await grantReferralCredits(db, provider().gateway, { now })).toEqual({
      granted: 1,
      failed: 0,
    });
  });

  it("uses the inviter's customer when they have one, and keeps the one it makes when they do not", async () => {
    const { inviter, invited } = await invitedBy("ana@example.com", "bia@example.com");
    await pays(invited.id, "ch_1");
    const { asked, gateway } = provider();
    await grantReferralCredits(db, gateway, { now });
    expect(asked[0]?.customerId).toBeNull();
    const [plan] = await db.select().from(plans).where(eq(plans.userId, inviter.id));
    expect(plan?.providerCustomerId).toBe("cus_new");
    const second = await invitedBy("carla@example.com", "dani@example.com");
    await db
      .update(plans)
      .set({ providerCustomerId: "cus_carla" })
      .where(eq(plans.userId, second.inviter.id));
    await pays(second.invited.id, "ch_2");
    const next = provider();
    await grantReferralCredits(db, next.gateway, { now });
    expect(next.asked[0]?.customerId).toBe("cus_carla");
  });

  it("is nothing for an inviter whose account is gone", async () => {
    const { inviter, invited } = await invitedBy("ana@example.com", "bia@example.com");
    await pays(invited.id, "ch_1");
    await db
      .update(referrals)
      .set({ referrerId: null })
      .where(eq(referrals.referredId, invited.id));
    const { asked, gateway } = provider();
    expect(await grantReferralCredits(db, gateway, { now })).toEqual({ granted: 0, failed: 0 });
    expect(asked).toEqual([]);
    expect(await earnedCredit(db, inviter.id)).toBe(0);
  });

  it("is nothing for a payment that was refunded in full before the credit was granted", async () => {
    const { inviter, invited } = await invitedBy("eli@example.com", "fabi@example.com");
    // The refund helper refunds 1000 in full, so the payment is 1000.
    await pays(invited.id, "ch_full", 1000);
    await deliver(chargeRefunded("evt_full", `cus_${invited.id}`, true, "ch_full"));
    const { asked, gateway } = provider();
    expect(await grantReferralCredits(db, gateway, { now })).toEqual({ granted: 0, failed: 0 });
    expect(asked).toEqual([]);
    expect(await earnedCredit(db, inviter.id)).toBe(0);
  });

  it("is only the invitation's own: a payer nobody invited earns nobody anything", async () => {
    const paying = await subscriber("solo@example.com");
    await pays(paying.id, "ch_solo");
    const { asked, gateway } = provider();
    expect(await grantReferralCredits(db, gateway, { now })).toEqual({ granted: 0, failed: 0 });
    expect(asked).toEqual([]);
  });
});
