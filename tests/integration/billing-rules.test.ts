import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { canBuy, changeCancellation, readPlan } from "@/lib/billing/service";
import { paymentEvents } from "@/lib/db/schema/billing";
import { billingFixture, gateway } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser } from "./factories";
import { chargeRefunded, checkoutCompleted, sign } from "./stripe-events";

const db = testDatabase();
const { deliver, subscriber } = billingFixture(db);

describe("a refund", () => {
  it("takes the plan back on a full refund and ends a subscription that is still running", async () => {
    const user = await subscriber();
    const { cancel } = await deliver(chargeRefunded("evt_r", `cus_${user.id}`, true));
    expect(cancel).toHaveBeenCalledExactlyOnceWith(`sub_${user.id}`);
    expect(await readPlan(db, user.id)).toMatchObject({
      tier: "free",
      status: "canceled",
      providerSubscriptionId: null,
      providerCustomerId: `cus_${user.id}`,
    });
  });

  it("takes a lifetime plan back on a full refund without ending anything", async () => {
    const user = await createUser(db, "ana@example.com");
    await deliver(
      checkoutCompleted("evt_1", { userId: user.id, interval: "lifetime", customer: "cus_life" }),
    );
    const { cancel } = await deliver(chargeRefunded("evt_r", "cus_life", true));
    expect(cancel).not.toHaveBeenCalled();
    expect((await readPlan(db, user.id))?.tier).toBe("free");
  });

  it("only records a partial refund, and the plan stays", async () => {
    const user = await subscriber();
    const { cancel, result } = await deliver(chargeRefunded("evt_r", `cus_${user.id}`, false));
    expect(result).toBe("applied");
    expect(cancel).not.toHaveBeenCalled();
    expect(await readPlan(db, user.id)).toMatchObject({ tier: "paid", status: "active" });
    expect(await db.select().from(paymentEvents).where(eq(paymentEvents.id, "evt_r"))).toHaveLength(
      1,
    );
  });

  it("does not touch anyone for a customer it does not know", async () => {
    const { result } = await deliver(chargeRefunded("evt_r", "cus_stranger", true));
    expect(result).toBe("applied");
  });
});

describe("a signature that does not match", () => {
  it("is refused before anything is read", () => {
    const { body } = sign(
      checkoutCompleted("evt_1", { userId: crypto.randomUUID(), interval: "monthly" }),
    );
    const forged = sign({ id: "evt_1" }, "whsec_someone_elses_secret");
    expect(() => gateway.readEvent(body, forged.signature)).toThrow();
    expect(() => gateway.readEvent(body, "")).toThrow();
  });

  it("ignores an event type the app does not act on, and still locks its id", async () => {
    const { result } = await deliver({
      id: "evt_x",
      object: "event",
      type: "customer.created",
      data: { object: {} },
    });
    expect(result).toBe("applied");
  });
});

describe("who may buy what", () => {
  it("lets a free account buy anything, and a lifetime owner buy nothing", async () => {
    const user = await createUser(db, "ana@example.com");
    const free = await readPlan(db, user.id);
    expect(canBuy(free, "monthly")).toBe(true);
    await deliver(checkoutCompleted("evt_1", { userId: user.id, interval: "lifetime" }));
    const lifetime = await readPlan(db, user.id);
    expect(canBuy(lifetime, "lifetime")).toBe(false);
    expect(canBuy(lifetime, "monthly")).toBe(false);
  });

  it("lets a subscriber replace the subscription with lifetime, and nothing else", async () => {
    const user = await subscriber();
    const plan = await readPlan(db, user.id);
    expect(canBuy(plan, "lifetime")).toBe(true);
    expect(canBuy(plan, "yearly")).toBe(false);
  });
});

describe("canceling at the end of the period", () => {
  it("changes the provider first and then the plan, in both directions", async () => {
    const user = await subscriber();
    const setAtProvider = vi.fn(() => Promise.resolve());
    await changeCancellation(db, user.id, true, setAtProvider);
    expect(setAtProvider).toHaveBeenCalledWith(`sub_${user.id}`, true);
    expect((await readPlan(db, user.id))?.cancelAtPeriodEnd).toBe(true);
    await changeCancellation(db, user.id, false, setAtProvider);
    expect((await readPlan(db, user.id))?.cancelAtPeriodEnd).toBe(false);
  });

  it("leaves the plan as it was when the provider refuses", async () => {
    const user = await subscriber();
    await expect(
      changeCancellation(db, user.id, true, () => Promise.reject(new Error("provider is down"))),
    ).rejects.toThrow("provider is down");
    expect((await readPlan(db, user.id))?.cancelAtPeriodEnd).toBe(false);
  });

  it("refuses when there is no subscription to cancel", async () => {
    const user = await createUser(db, "ana@example.com");
    await expect(
      changeCancellation(db, user.id, true, () => Promise.resolve()),
    ).rejects.toMatchObject({
      status: 409,
      key: "noSubscription",
    });
  });
});
