import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { twoTierCatalog } from "@/domain/billing/catalog.fixture";
import { applyPaymentEvent } from "@/lib/billing/events";
import { canBuy, checkoutTier, readPlan } from "@/lib/billing/service";
import { addTierStatements } from "@/lib/db/plan-tiers";
import { gateway } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser } from "./factories";
import { checkoutCompleted, sign, subscriptionUpdated } from "./stripe-events";

/*
 * A product that sells two paid tiers, `plus` and `team`, proven against the test catalog: the
 * base's own catalog sells one tier, so these paths never run with it.
 */

const db = testDatabase();

beforeAll(async () => {
  await db.execute(
    sql.raw(addTierStatements(["plus", "team"]).replaceAll("--> statement-breakpoint", "")),
  );
});

function deliver(payload: Record<string, unknown>) {
  const { body, signature } = sign(payload);
  return applyPaymentEvent(
    db,
    gateway.readEvent(body, signature),
    vi.fn(() => Promise.resolve()),
    twoTierCatalog,
  );
}

async function subscriberOn(tier: string | undefined, email = "ana@example.com") {
  const user = await createUser(db, email);
  await deliver(
    checkoutCompleted(`evt_buy_${user.id}`, {
      userId: user.id,
      interval: "monthly",
      ...(tier === undefined ? {} : { tier }),
      customer: `cus_${user.id}`,
      subscription: `sub_${user.id}`,
    }),
  );
  return user;
}

describe("a checkout of one of several paid tiers", () => {
  // Fails when the webhook grants the default tier whatever the checkout sold.
  it("grants the tier the checkout carried, with its price key", async () => {
    const user = await subscriberOn("team");
    expect(await readPlan(db, user.id)).toMatchObject({
      tier: "team",
      priceKey: "team.monthly",
      status: "active",
    });
  });

  // Fails when a checkout opened before the tier travelled with it stops granting anything.
  it("grants the default tier to a checkout that carried none", async () => {
    const user = await subscriberOn(undefined);
    expect(await readPlan(db, user.id)).toMatchObject({ tier: "plus", priceKey: "plus.monthly" });
  });

  // Fails when a paid checkout for a tier the catalog lost lands on some other tier silently.
  it("refuses a tier the catalog does not sell, so the delivery is retried and nothing changes", async () => {
    const user = await createUser(db, "ana@example.com");
    await expect(
      deliver(checkoutCompleted("evt_x", { userId: user.id, interval: "monthly", tier: "gold" })),
    ).rejects.toThrow('a checkout sold the tier "gold"');
    expect((await readPlan(db, user.id))?.tier).toBe("free");
  });
});

describe("a switch of tier in the customer portal", () => {
  // Fails when the plan keeps the old tier after the provider charges the new one.
  it("moves the plan to the tier and interval of the new price, once", async () => {
    const user = await subscriberOn("plus");
    const first = await deliver(subscriptionUpdated("evt_up", `sub_${user.id}`, "team_monthly"));
    expect(first.status).toBe("applied");
    expect(await readPlan(db, user.id)).toMatchObject({
      tier: "team",
      billingInterval: "monthly",
      priceKey: "team.monthly",
      status: "active",
    });
    const again = await deliver(subscriptionUpdated("evt_up", `sub_${user.id}`, "team_monthly"));
    expect(again.status).toBe("duplicate");
  });

  it("leaves the plan as it is for a price the catalog does not name", async () => {
    const user = await subscriberOn("plus");
    await deliver(subscriptionUpdated("evt_up", `sub_${user.id}`, "legacy_monthly"));
    expect(await readPlan(db, user.id)).toMatchObject({ tier: "plus", priceKey: "plus.monthly" });
  });
});

describe("buying with several paid tiers", () => {
  it("sells the tier asked for only in an interval it has a price for, and the default otherwise", () => {
    expect(checkoutTier("team", "monthly", twoTierCatalog)).toBe("team");
    expect(checkoutTier(undefined, "monthly", twoTierCatalog)).toBe("plus");
    expect(() => checkoutTier("team", "yearly", twoTierCatalog)).toThrow("tierNotSold");
    expect(() => checkoutTier("free", "monthly", twoTierCatalog)).toThrow("tierNotSold");
  });

  // Fails when a person on one paid tier can open a second subscription instead of switching.
  it("sends a subscriber to the portal to change tier, not to a new checkout", async () => {
    const user = await subscriberOn("plus");
    expect(canBuy(await readPlan(db, user.id), "monthly")).toBe(false);
  });
});
