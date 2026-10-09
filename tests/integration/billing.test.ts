import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { entitlementsFor, readPlan } from "@/lib/billing/service";
import { paymentEvents, plans } from "@/lib/db/schema/billing";
import { billingFixture, gateway } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser } from "./factories";
import {
  checkoutCompleted,
  checkoutFailed,
  invoiceEvent,
  priceChanged,
  sign,
  subscriptionDeleted,
} from "./stripe-events";

const db = testDatabase();
const premium = async (userId: string) =>
  (await entitlementsFor(db, { kind: "user", id: userId }, new Date())).features.has("premium");
const { deliver, subscriber } = billingFixture(db);

describe("a purchase", () => {
  it("starts every account on the free plan, with no access", async () => {
    const user = await createUser(db, "ana@example.com");
    const plan = await readPlan(db, user.id);
    expect(plan).toMatchObject({ tier: "free", status: "active", billingInterval: null });
    expect(await premium(user.id)).toBe(false);
  });

  it("makes a subscription checkout a paid plan with the customer and subscription kept", async () => {
    const user = await subscriber();
    expect(await readPlan(db, user.id)).toMatchObject({
      tier: "paid",
      status: "active",
      billingInterval: "monthly",
      providerCustomerId: `cus_${user.id}`,
      providerSubscriptionId: `sub_${user.id}`,
      cancelAtPeriodEnd: false,
    });
  });

  it("makes a one-off lifetime payment a paid plan with no subscription", async () => {
    const user = await createUser(db, "ana@example.com");
    await deliver(checkoutCompleted("evt_1", { userId: user.id, interval: "lifetime" }));
    expect(await readPlan(db, user.id)).toMatchObject({
      tier: "paid",
      billingInterval: "lifetime",
      providerSubscriptionId: null,
    });
  });

  it("waits for an asynchronous payment, and grants the plan when the money arrives", async () => {
    const user = await createUser(db, "ana@example.com");
    await deliver(
      checkoutCompleted("evt_1", {
        userId: user.id,
        interval: "lifetime",
        paymentStatus: "unpaid",
      }),
    );
    expect((await readPlan(db, user.id))?.tier).toBe("free");
    await deliver(
      checkoutCompleted(
        "evt_2",
        { userId: user.id, interval: "lifetime" },
        "checkout.session.async_payment_succeeded",
      ),
    );
    expect((await readPlan(db, user.id))?.tier).toBe("paid");
  });

  it("ignores a payment for a person who no longer exists", async () => {
    const { result } = await deliver(
      checkoutCompleted("evt_1", { userId: crypto.randomUUID(), interval: "monthly" }),
    );
    expect(result).toBe("applied");
    expect(await db.select().from(plans)).toEqual([]);
  });
});

describe("the end of the period", () => {
  it("is stored from the paid invoice, moves on renewal, and is cleared when the plan ends", async () => {
    const user = await subscriber();
    expect((await readPlan(db, user.id))?.currentPeriodEnd).toBeNull();
    await deliver(
      invoiceEvent("evt_i1", "invoice.payment_succeeded", `sub_${user.id}`, 1_900_000_000),
    );
    expect((await readPlan(db, user.id))?.currentPeriodEnd).toEqual(new Date(1_900_000_000_000));
    await deliver(
      invoiceEvent("evt_i2", "invoice.payment_succeeded", `sub_${user.id}`, 1_902_592_000),
    );
    expect((await readPlan(db, user.id))?.currentPeriodEnd).toEqual(new Date(1_902_592_000_000));
    await deliver(subscriptionDeleted("evt_end", `sub_${user.id}`));
    expect((await readPlan(db, user.id))?.currentPeriodEnd).toBeNull();
  });

  it("is not set by a failed payment", async () => {
    const user = await subscriber();
    await deliver(invoiceEvent("evt_f", "invoice.payment_failed", `sub_${user.id}`));
    expect((await readPlan(db, user.id))?.currentPeriodEnd).toBeNull();
  });
});

describe("the same delivery twice", () => {
  it("is applied once, and the second is only acknowledged", async () => {
    const user = await createUser(db, "ana@example.com");
    const purchase = checkoutCompleted("evt_1", { userId: user.id, interval: "lifetime" });
    expect((await deliver(purchase)).result).toBe("applied");
    await db
      .update(plans)
      .set({ tier: "free", billingInterval: null })
      .where(eq(plans.userId, user.id));
    expect((await deliver(purchase)).result).toBe("duplicate");
    // The replay changed nothing: the manual downgrade above is still what is stored.
    expect((await readPlan(db, user.id))?.tier).toBe("free");
    expect(await db.select().from(paymentEvents)).toHaveLength(1);
  });

  it("is retried when applying it failed, because the lock rolled back with the change", async () => {
    const user = await subscriber();
    const lifetime = checkoutCompleted("evt_2", { userId: user.id, interval: "lifetime" });
    const broken = vi.fn(() => Promise.reject(new Error("provider is down")));
    await expect(deliver(lifetime, broken)).rejects.toThrow("provider is down");
    expect(await db.select().from(paymentEvents).where(eq(paymentEvents.id, "evt_2"))).toEqual([]);
    expect((await readPlan(db, user.id))?.billingInterval).toBe("monthly");
    expect((await deliver(lifetime)).result).toBe("applied");
    expect((await readPlan(db, user.id))?.billingInterval).toBe("lifetime");
  });
});

describe("a payment that fails", () => {
  it("marks the plan past due and keeps the access until the subscription ends", async () => {
    const user = await subscriber();
    await deliver(invoiceEvent("evt_f", "invoice.payment_failed", `sub_${user.id}`));
    const late = await readPlan(db, user.id);
    expect(late).toMatchObject({ tier: "paid", status: "past_due" });
    expect(await premium(user.id)).toBe(true);

    await deliver(invoiceEvent("evt_ok", "invoice.payment_succeeded", `sub_${user.id}`));
    expect((await readPlan(db, user.id))?.status).toBe("active");

    await deliver(invoiceEvent("evt_f2", "invoice.payment_failed", `sub_${user.id}`));
    await deliver(subscriptionDeleted("evt_end", `sub_${user.id}`));
    const ended = await readPlan(db, user.id);
    expect(ended).toMatchObject({
      tier: "free",
      status: "canceled",
      billingInterval: null,
      providerSubscriptionId: null,
    });
    expect(await premium(user.id)).toBe(false);
  });

  it("leaves a lifetime plan alone when an old invoice fails", async () => {
    const user = await createUser(db, "ana@example.com");
    await deliver(checkoutCompleted("evt_1", { userId: user.id, interval: "lifetime" }));
    await deliver(invoiceEvent("evt_2", "invoice.payment_failed", "sub_old"));
    expect(await readPlan(db, user.id)).toMatchObject({ tier: "paid", status: "active" });
  });
});

describe("the lifetime plan over a subscription", () => {
  it("ends the subscription at once, and the provider's own deletion event changes nothing", async () => {
    const user = await subscriber();
    const { cancel } = await deliver(
      checkoutCompleted("evt_life", {
        userId: user.id,
        interval: "lifetime",
        customer: `cus_${user.id}`,
      }),
    );
    expect(cancel).toHaveBeenCalledExactlyOnceWith(`sub_${user.id}`);
    expect(await readPlan(db, user.id)).toMatchObject({
      tier: "paid",
      billingInterval: "lifetime",
      providerSubscriptionId: null,
    });

    await deliver(subscriptionDeleted("evt_gone", `sub_${user.id}`));
    expect((await readPlan(db, user.id))?.tier).toBe("paid");
  });

  it("does not end anything when there was no subscription", async () => {
    const user = await createUser(db, "ana@example.com");
    const { cancel } = await deliver(
      checkoutCompleted("evt_1", { userId: user.id, interval: "lifetime" }),
    );
    expect(cancel).not.toHaveBeenCalled();
  });

  it("replaces a courtesy: the person paid, so the plan is no longer a gift", async () => {
    const user = await createUser(db, "ana@example.com");
    await db
      .update(plans)
      .set({
        tier: "paid",
        billingInterval: "lifetime",
        courtesyGrantedByEmail: "admin@example.com",
        courtesyReason: "partner",
      })
      .where(eq(plans.userId, user.id));
    await deliver(
      checkoutCompleted("evt_1", { userId: user.id, interval: "monthly", subscription: "sub_1" }),
    );
    expect(await readPlan(db, user.id)).toMatchObject({
      billingInterval: "monthly",
      courtesyGrantedByEmail: null,
      courtesyReason: null,
    });
  });
});

describe("a price that changes at the provider", () => {
  it("is read as a change of prices, whatever its kind", () => {
    for (const type of ["price.created", "price.updated", "price.deleted"] as const) {
      const { body, signature } = sign(priceChanged(`evt_${type}`, type));
      expect(gateway.readEvent(body, signature)).toMatchObject({ kind: "prices_changed", type });
    }
  });
});

describe("a payment that has not arrived yet", () => {
  async function waiting(email: string) {
    const person = await createUser(db, email);
    await deliver(
      checkoutCompleted(`evt_wait_${person.id}`, {
        userId: person.id,
        interval: "yearly_once",
        paymentStatus: "unpaid",
      }),
    );
    return person;
  }

  it("is recorded as waiting, grants nothing, and remembers what is being bought", async () => {
    const ana = await waiting("ana@example.com");
    expect(await readPlan(db, ana.id)).toMatchObject({
      tier: "free",
      status: "pending",
      priceKey: "paid.yearly_once",
      billingInterval: null,
    });
    const now = new Date();
    expect((await entitlementsFor(db, { kind: "user", id: ana.id }, now)).tier).toBe("free");
  });

  it("becomes the plan when the money arrives", async () => {
    const ana = await waiting("ana@example.com");
    await deliver(
      checkoutCompleted(
        "evt_ok",
        { userId: ana.id, interval: "yearly_once" },
        "checkout.session.async_payment_succeeded",
      ),
    );
    expect(await readPlan(db, ana.id)).toMatchObject({
      tier: "paid",
      status: "active",
      billingInterval: "yearly_once",
    });
  });

  it("goes back to an ordinary free account when the payment fails or the session runs out", async () => {
    for (const type of [
      "checkout.session.async_payment_failed",
      "checkout.session.expired",
    ] as const) {
      const person = await waiting(`${type}@example.com`);
      await deliver(checkoutFailed(`evt_fail_${type}`, person.id, type));
      expect(await readPlan(db, person.id)).toMatchObject({
        tier: "free",
        status: "active",
        priceKey: null,
        provider: null,
      });
    }
  });

  it("never takes anything from a person who already has a plan", async () => {
    const paying = await subscriber("paga@example.com");
    await deliver(
      checkoutCompleted("evt_wait_paid", {
        userId: paying.id,
        interval: "yearly_once",
        paymentStatus: "unpaid",
      }),
    );
    expect(await readPlan(db, paying.id)).toMatchObject({ tier: "paid", status: "active" });
    await deliver(checkoutFailed("evt_fail_paid", paying.id));
    expect(await readPlan(db, paying.id)).toMatchObject({ tier: "paid", status: "active" });
  });

  it("is told only once when the same failure is delivered twice", async () => {
    const ana = await waiting("ana@example.com");
    await deliver(checkoutFailed("evt_same", ana.id));
    const again = await deliver(checkoutFailed("evt_same", ana.id));
    expect(again.result).toBe("duplicate");
  });
});
