import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { oneYearAfter } from "@/domain/billing/term";
import { entitlementsFor, readPlan } from "@/lib/billing/service";
import { plans } from "@/lib/db/schema/billing";
import { expireFixedTerms, warnExpiringTerms } from "@/lib/scheduled/fixed-terms";
import { billingFixture } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser } from "./factories";
import { checkoutCompleted, EVENT_CREATED_SECONDS } from "./stripe-events";

const sent = vi.hoisted(() => ({ to: [] as string[], fail: false }));
vi.mock("@/lib/billing/mailer", () => ({
  sendPlanExpiring: (input: { to: string }) => {
    sent.to.push(input.to);
    return Promise.resolve(!sent.fail);
  },
}));

const db = testDatabase();
const { deliver } = billingFixture(db);
const bought = new Date(EVENT_CREATED_SECONDS * 1000);
const end = oneYearAfter(bought);
const DAY = 86_400_000;
const at = (days: number) => new Date(end.getTime() + days * DAY);

async function buyYear(email: string) {
  const person = await createUser(db, email);
  await deliver(
    checkoutCompleted(`evt_year_${person.id}`, {
      userId: person.id,
      interval: "yearly_once",
      customer: `cus_${person.id}`,
    }),
  );
  return person;
}

beforeEach(() => {
  sent.to.length = 0;
  sent.fail = false;
});

describe("a year bought once", () => {
  it("runs for a year from the payment, with no subscription behind it", async () => {
    const ana = await buyYear("ana@example.com");
    const plan = await readPlan(db, ana.id);
    expect(plan).toMatchObject({
      tier: "paid",
      billingInterval: "yearly_once",
      providerSubscriptionId: null,
      priceKey: "paid.yearly_once",
    });
    expect(plan?.currentPeriodEnd).toEqual(end);
  });

  it("grants the paid tier until the last instant, and the free tier from then on", async () => {
    const ana = await buyYear("ana@example.com");
    const holder = { kind: "user", id: ana.id } as const;
    expect((await entitlementsFor(db, holder, at(-1))).tier).toBe("paid");
    expect((await entitlementsFor(db, holder, end)).tier).toBe("free");
    expect((await entitlementsFor(db, holder, at(30))).tier).toBe("free");
  });
});

describe("the daily call that ends a year", () => {
  it("makes the record say free once the year is over, and does nothing a second time", async () => {
    const ana = await buyYear("ana@example.com");
    expect(await expireFixedTerms.run({ db, now: at(-1) })).toEqual({ expired: 0 });
    expect(await expireFixedTerms.run({ db, now: at(1) })).toEqual({ expired: 1 });
    expect(await readPlan(db, ana.id)).toMatchObject({
      tier: "free",
      billingInterval: null,
      currentPeriodEnd: null,
    });
    expect(await expireFixedTerms.run({ db, now: at(2) })).toEqual({ expired: 0 });
  });

  it("leaves a subscription and a lifetime plan alone, whatever their dates", async () => {
    const { subscriber } = billingFixture(db);
    const subscribed = await subscriber("sub@example.com");
    await db
      .update(plans)
      .set({ currentPeriodEnd: at(-100) })
      .where(eq(plans.userId, subscribed.id));
    expect(await expireFixedTerms.run({ db, now: at(1) })).toEqual({ expired: 0 });
    expect((await readPlan(db, subscribed.id))?.tier).toBe("paid");
  });
});

describe("the warning before a year ends", () => {
  it("goes out once, only inside the last week", async () => {
    await buyYear("ana@example.com");
    expect(await warnExpiringTerms.run({ db, now: at(-10) })).toEqual({ warned: 0, failed: 0 });
    expect(await warnExpiringTerms.run({ db, now: at(-6) })).toEqual({ warned: 1, failed: 0 });
    expect(sent.to).toEqual(["ana@example.com"]);
    expect(await warnExpiringTerms.run({ db, now: at(-5) })).toEqual({ warned: 0, failed: 0 });
    expect(sent.to).toHaveLength(1);
  });

  it("is not sent for a year that has already ended", async () => {
    await buyYear("ana@example.com");
    expect(await warnExpiringTerms.run({ db, now: at(1) })).toEqual({ warned: 0, failed: 0 });
    expect(sent.to).toEqual([]);
  });

  it("gives the claim back when the e-mail fails, so the next run tries again", async () => {
    const ana = await buyYear("ana@example.com");
    sent.fail = true;
    expect(await warnExpiringTerms.run({ db, now: at(-3) })).toEqual({ warned: 0, failed: 1 });
    expect((await readPlan(db, ana.id))?.expiryWarnedAt).toBeNull();
    sent.fail = false;
    expect(await warnExpiringTerms.run({ db, now: at(-2) })).toEqual({ warned: 1, failed: 0 });
  });

  it("does not send twice when two runs arrive at the same time", async () => {
    await buyYear("ana@example.com");
    await Promise.all([
      warnExpiringTerms.run({ db, now: at(-3) }),
      warnExpiringTerms.run({ db, now: at(-3) }),
    ]);
    expect(sent.to).toHaveLength(1);
  });
});
