import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { deleteAccount } from "@/lib/accounts/delete";
import { paymentsOf } from "@/lib/billing/payments";
import { readPlan } from "@/lib/billing/service";
import { payments } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import type { FileStorage } from "@/lib/ports/storage/types";
import { billingFixture } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser, recordingLogger } from "./factories";
import { chargeRefunded, chargeSucceeded, checkoutCompleted } from "./stripe-events";

const db = testDatabase();
const { deliver, subscriber } = billingFixture(db);

describe("the payment record", () => {
  it("records a charge for a known customer with the payer, in cents and lower-case currency", async () => {
    const user = await subscriber();
    await deliver(
      chargeSucceeded("evt_c", { id: "ch_1", customer: `cus_${user.id}`, method: "pix" }),
    );
    expect(await paymentsOf(db, user.id)).toMatchObject([
      {
        providerPaymentId: "ch_1",
        payerEmail: "ana@example.com",
        amountCents: 1000,
        currency: "brl",
        method: "pix",
        status: "paid",
        refundedCents: 0,
      },
    ]);
  });

  it("keeps a charge that arrives before the checkout and links it when the checkout lands", async () => {
    const user = await createUser(db, "bia@example.com");
    await deliver(
      chargeSucceeded("evt_c", { id: "ch_early", customer: "cus_new", email: "bia@pay.example" }),
    );
    const [early] = await db.select().from(payments);
    expect(early).toMatchObject({ payerId: null, payerEmail: "bia@pay.example" });
    await deliver(
      checkoutCompleted("evt_k", { userId: user.id, interval: "lifetime", customer: "cus_new" }),
    );
    expect(await paymentsOf(db, user.id)).toMatchObject([
      { providerPaymentId: "ch_early", payerEmail: "bia@example.com" },
    ]);
  });

  it("counts a charge once, whatever event delivers it again", async () => {
    const user = await subscriber();
    const first = await deliver(
      chargeSucceeded("evt_a", { id: "ch_1", customer: `cus_${user.id}` }),
    );
    const again = await deliver(
      chargeSucceeded("evt_b", { id: "ch_1", customer: `cus_${user.id}` }),
    );
    expect(await db.select().from(payments)).toHaveLength(1);
    // Only the first recording is reported, so the funnel counts the payment once.
    expect(first.newPayment).toEqual({ payerId: user.id, method: "card", cents: 1000 });
    expect(again.newPayment).toBeNull();
  });

  it("marks a partial refund and then a full one on the same charge", async () => {
    const user = await subscriber();
    await deliver(chargeSucceeded("evt_c", { id: "ch_1", customer: `cus_${user.id}` }));
    await deliver(chargeRefunded("evt_p", `cus_${user.id}`, false, "ch_1"));
    expect((await paymentsOf(db, user.id))[0]).toMatchObject({
      status: "partially_refunded",
      refundedCents: 300,
    });
    await deliver(chargeRefunded("evt_f", `cus_${user.id}`, true, "ch_1"));
    expect((await paymentsOf(db, user.id))[0]).toMatchObject({
      status: "refunded",
      refundedCents: 1000,
    });
    expect((await readPlan(db, user.id))?.tier).toBe("free");
  });

  it("keeps the payment, with the payer's e-mail, after the account is deleted", async () => {
    const user = await subscriber();
    await deliver(chargeSucceeded("evt_c", { id: "ch_1", customer: `cus_${user.id}` }));
    await deleteAccount(
      db,
      {
        cancelBilling: () => Promise.resolve(),
        storage: () => Promise.resolve({} as FileStorage),
        deleteProviderUser: () => Promise.resolve(),
        logger: recordingLogger(),
      },
      { userId: user.id, requestedBy: "self" },
    );
    expect(await db.select().from(users).where(eq(users.id, user.id))).toEqual([]);
    expect(await db.select().from(payments)).toMatchObject([
      { payerId: null, payerEmail: "ana@example.com", amountCents: 1000 },
    ]);
  });
});
