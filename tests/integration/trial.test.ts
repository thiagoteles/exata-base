import { describe, expect, it } from "vitest";
import { entitlementsFor, readPlan } from "@/lib/billing/service";
import { billingFixture } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser } from "./factories";
import {
  chargeRefunded,
  chargeSucceeded,
  checkoutCompleted,
  EVENT_CREATED_SECONDS,
  invoiceEvent,
  trialWillEnd,
} from "./stripe-events";

const db = testDatabase();
const { deliver } = billingFixture(db);
const DAY_SECONDS = 86_400;
const started = new Date(EVENT_CREATED_SECONDS * 1000);
const trialEnd = new Date((EVENT_CREATED_SECONDS + 14 * DAY_SECONDS) * 1000);
const premium = async (id: string, now: Date) =>
  (await entitlementsFor(db, { kind: "user", id }, now)).features.has("premium");

async function startTrial(email: string) {
  const person = await createUser(db, email);
  const delivery = await deliver(
    checkoutCompleted(`evt_trial_${person.id}`, {
      userId: person.id,
      interval: "monthly",
      customer: `cus_${person.id}`,
      subscription: `sub_${person.id}`,
      trialDays: 14,
    }),
  );
  return { person, delivery };
}

describe("a free trial", () => {
  it("starts the plan, ends in fourteen days, and spends the account's one trial", async () => {
    const { person, delivery } = await startTrial("ana@example.com");
    const plan = await readPlan(db, person.id);
    expect(plan).toMatchObject({ tier: "paid", status: "trialing", billingInterval: "monthly" });
    expect(plan?.currentPeriodEnd).toEqual(trialEnd);
    expect(plan?.trialUsedAt).toEqual(started);
    expect(delivery.effects.trialStarted).toEqual({ userId: person.id, interval: "monthly" });
  });

  it("grants access during the trial and not after it ends, charged or not", async () => {
    const { person } = await startTrial("ana@example.com");
    expect(await premium(person.id, new Date(trialEnd.getTime() - 1))).toBe(true);
    expect(await premium(person.id, trialEnd)).toBe(false);
  });

  it("becomes an ordinary active plan when the first invoice is paid, and keeps the trial spent", async () => {
    const { person } = await startTrial("ana@example.com");
    await deliver(
      invoiceEvent("evt_first", "invoice.payment_succeeded", `sub_${person.id}`, 1_900_000_000),
    );
    const plan = await readPlan(db, person.id);
    expect(plan).toMatchObject({ status: "active", tier: "paid" });
    expect(plan?.trialUsedAt).toEqual(started);
  });

  it("is not a trial at all when the checkout asked for none", async () => {
    const person = await createUser(db, "bia@example.com");
    const { effects } = await deliver(
      checkoutCompleted("evt_plain", {
        userId: person.id,
        interval: "monthly",
        subscription: "sub_1",
      }),
    );
    expect(effects.trialStarted).toBeNull();
    expect(await readPlan(db, person.id)).toMatchObject({ status: "active", trialUsedAt: null });
  });
});

describe("the warning before a trial ends", () => {
  it("names the person whose trial it is, and the day it ends", async () => {
    const { person } = await startTrial("ana@example.com");
    const { effects } = await deliver(
      trialWillEnd("evt_warn", `sub_${person.id}`, EVENT_CREATED_SECONDS + 14 * DAY_SECONDS),
    );
    expect(effects.trialEnding).toEqual({
      userId: person.id,
      email: "ana@example.com",
      name: expect.any(String),
      endsAt: trialEnd,
    });
  });

  it("is for nobody once the plan is no longer a trial, or for a subscription it does not know", async () => {
    const { person } = await startTrial("ana@example.com");
    await deliver(invoiceEvent("evt_paid", "invoice.payment_succeeded", `sub_${person.id}`));
    const late = await deliver(trialWillEnd("evt_late", `sub_${person.id}`, EVENT_CREATED_SECONDS));
    expect(late.effects.trialEnding).toBeNull();
    const stranger = await deliver(
      trialWillEnd("evt_stranger", "sub_nobody", EVENT_CREATED_SECONDS),
    );
    expect(stranger.effects.trialEnding).toBeNull();
  });
});

describe("a refund as the funnel counts it", () => {
  it("says how much went back and whose it was, once, and nothing for a payment it never saw", async () => {
    const { person } = await startTrial("ana@example.com");
    await deliver(
      chargeSucceeded("evt_charge", {
        id: "ch_1",
        customer: `cus_${person.id}`,
        amount: 1000,
        email: "ana@example.com",
      }),
    );
    const first = await deliver(chargeRefunded("evt_ref1", `cus_${person.id}`, false, "ch_1"));
    expect(first.effects.refund).toEqual({ payerId: person.id, cents: 300, currency: "brl" });
    const unknown = await deliver(
      chargeRefunded("evt_ref2", `cus_${person.id}`, false, "ch_unknown"),
    );
    expect(unknown.effects.refund).toBeNull();
  });
});
