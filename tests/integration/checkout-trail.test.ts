import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { checkoutSessions } from "@/lib/db/schema/billing";
import { billingFixture } from "./billing-fixture";
import { testDatabase } from "./database";
import { createUser } from "./factories";
import { checkoutCompleted, checkoutFailed } from "./stripe-events";

const db = testDatabase();
const { deliver } = billingFixture(db);

/** A checkout the app opened for a person, as the checkout action records it. */
async function opened(
  email: string,
  id: string,
  source = "catalog",
  interval: "monthly" | "yearly_once" = "monthly",
) {
  const person = await createUser(db, email);
  await db.insert(checkoutSessions).values({
    userId: person.id,
    provider: "stripe",
    providerSessionId: `cs_${id}`,
    interval,
    source,
    currency: "brl",
  });
  return person;
}

const trail = async (id: string) =>
  (
    await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.providerSessionId, `cs_${id}`))
  )[0];

describe("the trail of a checkout", () => {
  it("starts open, and becomes paid with the screen that showed the offer", async () => {
    const ana = await opened("ana@example.com", "evt_paid", "catalog");
    expect((await trail("evt_paid"))?.status).toBe("open");
    const { effects } = await deliver(
      checkoutCompleted("evt_paid", { userId: ana.id, interval: "monthly", subscription: "sub_1" }),
    );
    expect(effects.checkoutCompleted).toEqual({
      userId: ana.id,
      interval: "monthly",
      source: "catalog",
    });
    const row = await trail("evt_paid");
    expect(row?.status).toBe("paid");
    expect(row?.closedAt).not.toBeNull();
  });

  it("waits while a Pix is pending and ends paid when the money arrives", async () => {
    const bia = await opened("bia@example.com", "evt_pix", "plans", "yearly_once");
    await deliver(
      checkoutCompleted("evt_pix", {
        userId: bia.id,
        interval: "yearly_once",
        paymentStatus: "unpaid",
      }),
    );
    expect((await trail("evt_pix"))?.status).toBe("pending");
    expect((await trail("evt_pix"))?.closedAt).toBeNull();
    const { effects } = await deliver(
      checkoutCompleted(
        "evt_pix_ok",
        { userId: bia.id, interval: "yearly_once", sessionId: "cs_evt_pix" },
        "checkout.session.async_payment_succeeded",
      ),
    );
    expect(effects.checkoutCompleted).toMatchObject({ source: "plans", interval: "yearly_once" });
    expect((await trail("evt_pix"))?.status).toBe("paid");
  });

  it("ends expired when the session runs out and failed when the bank refuses", async () => {
    const carla = await opened("carla@example.com", "evt_gone");
    await deliver(
      checkoutFailed("evt_gone_event", carla.id, "checkout.session.expired", "cs_evt_gone"),
    );
    expect((await trail("evt_gone"))?.status).toBe("expired");
    expect((await trail("evt_gone"))?.closedAt).not.toBeNull();
    const dani = await opened("dani@example.com", "evt_bank");
    await deliver(
      checkoutFailed(
        "evt_bank_event",
        dani.id,
        "checkout.session.async_payment_failed",
        "cs_evt_bank",
      ),
    );
    expect((await trail("evt_bank"))?.status).toBe("failed");
  });

  it("never takes a paid checkout back when a late event arrives", async () => {
    const dani = await opened("dani@example.com", "evt_late");
    await deliver(
      checkoutCompleted("evt_late", {
        userId: dani.id,
        interval: "monthly",
        subscription: "sub_2",
      }),
    );
    await deliver(checkoutFailed("evt_late", dani.id, "checkout.session.expired"));
    expect((await trail("evt_late"))?.status).toBe("paid");
  });

  it("is no conversion for a checkout the trail never saw", async () => {
    const eva = await createUser(db, "eva@example.com");
    const { effects } = await deliver(
      checkoutCompleted("evt_unseen", {
        userId: eva.id,
        interval: "monthly",
        subscription: "sub_3",
      }),
    );
    expect(effects.checkoutCompleted).toBeNull();
  });
});
