import { describe, expect, it } from "vitest";
import { readReferralReport } from "@/lib/admin/referrals";
import { payments } from "@/lib/db/schema/billing";
import { referrals } from "@/lib/db/schema/referrals";
import { testDatabase } from "./database";
import { createUser } from "./factories";

/*
 * The admin's referral report. What can break unnoticed is the counting itself: who counts as paying
 * (any payment that went through, a partial refund included, a full refund not), credit summed in
 * reais only, a credit still due flagged, and an inviter whose account is gone still counted.
 */

const db = testDatabase();

async function paid(
  payerId: string,
  id: string,
  status: "paid" | "partially_refunded" | "refunded",
) {
  await db.insert(payments).values({
    provider: "stripe",
    providerPaymentId: id,
    payerId,
    payerEmail: "x@example.com",
    amountCents: 2990,
    refundedCents: { paid: 0, partially_refunded: 1000, refunded: 2990 }[status],
    currency: "brl",
    paidAt: new Date("2026-06-01T12:00:00Z"),
    status,
  });
}

describe("referral report", () => {
  it("is for admins only", async () => {
    const staff = await createUser(db, "staff@example.com", "staff");
    await expect(readReferralReport(db, { id: staff.id, role: "staff" })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("counts arrivals, payers, credit in reais and credit still due, by inviter and by source", async () => {
    const admin = await createUser(db, "admin@example.com", "admin");
    const ana = await createUser(db, "ana@example.com");
    const [paying, refunded, failed, rewarded, other] = await Promise.all(
      ["b@example.com", "c@example.com", "d@example.com", "e@example.com", "f@example.com"].map(
        (email) => createUser(db, email),
      ),
    );
    if (!(paying && refunded && failed && rewarded && other)) {
      throw new Error("users were not created");
    }
    const at = (day: number) => new Date(`2026-05-${String(day).padStart(2, "0")}T12:00:00Z`);
    await db.insert(referrals).values([
      {
        referredId: paying.id,
        referrerId: ana.id,
        referrerEmail: ana.email,
        source: "whatsapp",
        createdAt: at(1),
      },
      {
        referredId: refunded.id,
        referrerId: ana.id,
        referrerEmail: ana.email,
        source: "whatsapp",
        createdAt: at(2),
      },
      { referredId: failed.id, referrerId: ana.id, referrerEmail: ana.email, createdAt: at(3) },
      {
        referredId: rewarded.id,
        referrerId: ana.id,
        referrerEmail: ana.email,
        source: "email",
        rewardedAt: at(10),
        rewardCents: 1000,
        rewardCurrency: "brl",
        createdAt: at(4),
      },
      // The inviter's account is gone: the row stays with the e-mail they had, and no credit is due.
      {
        referredId: other.id,
        referrerId: null,
        referrerEmail: "gone@example.com",
        createdAt: at(5),
      },
    ]);
    await paid(paying.id, "p1", "paid");
    await paid(refunded.id, "p2", "partially_refunded");
    await paid(failed.id, "p3", "refunded");
    await paid(rewarded.id, "p4", "paid");
    await paid(other.id, "p5", "paid");

    const report = await readReferralReport(db, { id: admin.id, role: "admin" });

    expect(report.totals).toEqual({
      arrivals: 5,
      paying: 4,
      rewarded: 1,
      rewardedCents: 1000,
      awaitingCredit: 2,
    });
    expect(report.top).toEqual([
      { referrerId: ana.id, email: "ana@example.com", arrivals: 4, paying: 3, rewardedCents: 1000 },
      { referrerId: null, email: "gone@example.com", arrivals: 1, paying: 1, rewardedCents: 0 },
    ]);
    expect(report.sources).toEqual([
      { source: "whatsapp", arrivals: 2 },
      { source: null, arrivals: 2 },
      { source: "email", arrivals: 1 },
    ]);
    expect(report.recent.map((row) => [row.referredEmail, row.paying, row.rewarded])).toEqual([
      ["f@example.com", true, false],
      ["e@example.com", true, true],
      ["d@example.com", false, false],
      ["c@example.com", true, false],
      ["b@example.com", true, false],
    ]);
  });
});
