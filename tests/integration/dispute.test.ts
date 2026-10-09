import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { payments } from "@/lib/db/schema/billing";
import { billingFixture } from "./billing-fixture";
import { testDatabase } from "./database";
import { chargeRefunded, chargeSucceeded, disputeCreated } from "./stripe-events";

const db = testDatabase();
const { deliver, subscriber } = billingFixture(db);

async function paid(email: string, charge: string, amount = 2900) {
  const person = await subscriber(email);
  await deliver(
    chargeSucceeded(`evt_${charge}`, {
      id: charge,
      customer: `cus_${person.id}`,
      amount,
      email,
    }),
  );
  return person;
}

const statusOf = async (charge: string) =>
  (await db.select().from(payments).where(eq(payments.providerPaymentId, charge)))[0]?.status;

describe("a dispute", () => {
  it("marks the payment as disputed, so it is never read as settled money", async () => {
    await paid("ana@example.com", "ch_1");
    expect(await statusOf("ch_1")).toBe("paid");
    const { effects, result } = await deliver(disputeCreated("evt_dp", "ch_1", 2900));
    expect(result).toBe("applied");
    expect(await statusOf("ch_1")).toBe("disputed");
    expect(effects.dispute).toEqual({
      paymentId: "ch_1",
      amountCents: 2900,
      reason: "fraudulent",
      known: true,
    });
  });

  it("is still reported for a charge this database never saw, since the provider is owed an answer", async () => {
    const { effects } = await deliver(disputeCreated("evt_dp2", "ch_unknown"));
    expect(effects.dispute).toMatchObject({ paymentId: "ch_unknown", known: false });
  });

  it("is reported once however many times the provider delivers it", async () => {
    await paid("bia@example.com", "ch_2");
    await deliver(disputeCreated("evt_same", "ch_2"));
    const again = await deliver(disputeCreated("evt_same", "ch_2"));
    expect(again.result).toBe("duplicate");
    expect(again.effects.dispute).toBeNull();
  });

  it("carries nothing about the person in what it reports", async () => {
    await paid("carla@example.com", "ch_3");
    const { effects } = await deliver(disputeCreated("evt_dp3", "ch_3"));
    expect(JSON.stringify(effects.dispute)).not.toContain("carla");
  });

  it("gives way to a refund that follows it, which is the end of the matter for that money", async () => {
    // The refund helper refunds 1000 in full, so the payment is 1000.
    const person = await paid("dani@example.com", "ch_4", 1000);
    await deliver(disputeCreated("evt_dp4", "ch_4"));
    await deliver(chargeRefunded("evt_ref", `cus_${person.id}`, true, "ch_4"));
    expect(await statusOf("ch_4")).toBe("refunded");
  });
});
