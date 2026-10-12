import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { readBusinessNumbers } from "@/lib/admin/numbers";
import { payments, plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();
// 01:30 in São Paulo on 10 June: the local day is 10 June, while UTC is already 10 June 04:30.
const now = new Date("2026-06-10T04:30:00Z");

async function adminViewer() {
  const admin = await createUser(db, "admin@example.com", "admin");
  await db
    .update(users)
    .set({ createdAt: new Date("2026-01-01T12:00:00Z") })
    .where(eq(users.id, admin.id));
  return { id: admin.id, role: admin.role };
}

async function payment({
  id,
  payerId,
  paidAt,
  cents,
  refunded = 0,
}: {
  id: string;
  payerId: string;
  paidAt: string;
  cents: number;
  refunded?: number;
}) {
  await db.insert(payments).values({
    provider: "stripe",
    providerPaymentId: id,
    payerId,
    payerEmail: "x@example.com",
    amountCents: cents,
    refundedCents: refunded,
    currency: "brl",
    paidAt: new Date(paidAt),
    status: refunded === 0 ? "paid" : "partially_refunded",
  });
}

describe("business numbers", () => {
  it("are for admins only", async () => {
    const staff = await createUser(db, "staff@example.com", "staff");
    await expect(
      readBusinessNumbers(db, { id: staff.id, role: "staff" }, 7, now),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("count sign-ups per local day, every day of the range present", async () => {
    const viewer = await adminViewer();
    const late = await createUser(db, "late@example.com");
    // 23:30 on 8 June in São Paulo is already 9 June in UTC; it belongs to the 8th.
    await db
      .update(users)
      .set({ createdAt: new Date("2026-06-09T02:30:00Z") })
      .where(eq(users.id, late.id));
    const early = await createUser(db, "early@example.com");
    await db
      .update(users)
      .set({ createdAt: new Date("2026-06-10T03:00:00Z") })
      .where(eq(users.id, early.id));

    const { signups } = await readBusinessNumbers(db, viewer, 7, now);
    expect(signups.map((day) => day.day)).toEqual([
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
    ]);
    expect(signups.find((day) => day.day === "2026-06-08")?.value).toBe(1);
    expect(signups.find((day) => day.day === "2026-06-10")?.value).toBe(1);
    expect(signups.reduce((total, day) => total + day.value, 0)).toBe(2);
  });

  it("sum revenue net of refunds, and the refunds of the period apart", async () => {
    const viewer = await adminViewer();
    const ana = await createUser(db, "ana@example.com");
    await payment({ id: "ch_1", payerId: ana.id, paidAt: "2026-06-09T15:00:00Z", cents: 2990 });
    await payment({
      id: "ch_2",
      payerId: ana.id,
      paidAt: "2026-06-09T16:00:00Z",
      cents: 1000,
      refunded: 300,
    });
    await payment({ id: "ch_old", payerId: ana.id, paidAt: "2026-05-01T15:00:00Z", cents: 5000 });
    const numbers = await readBusinessNumbers(db, viewer, 7, now);
    expect(numbers.revenueCents.find((day) => day.day === "2026-06-09")?.value).toBe(3690);
    expect(numbers.revenueCents.reduce((total, day) => total + day.value, 0)).toBe(3690);
    expect(numbers.refundedCents).toBe(300);
  });

  it("count payers by tier apart from courtesies and scheduled cancellations", async () => {
    const viewer = await adminViewer();
    const [ana, bia, caio, dani] = await Promise.all(
      ["ana", "bia", "caio", "dani"].map((name) => createUser(db, `${name}@example.com`)),
    );
    const paid = {
      tier: "paid" as const,
      status: "active" as const,
      billingInterval: "monthly" as const,
    };
    await db
      .update(plans)
      .set(paid)
      .where(eq(plans.userId, ana?.id ?? ""));
    await db
      .update(plans)
      .set({ ...paid, cancelAtPeriodEnd: true })
      .where(eq(plans.userId, bia?.id ?? ""));
    await db
      .update(plans)
      .set({
        ...paid,
        billingInterval: "lifetime",
        courtesyGrantedByEmail: "a@b.c",
        courtesyReason: "parceria",
      })
      .where(eq(plans.userId, caio?.id ?? ""));
    await db
      .update(plans)
      .set({ ...paid, status: "canceled" })
      .where(eq(plans.userId, dani?.id ?? ""));
    const numbers = await readBusinessNumbers(db, viewer, 30, now);
    expect(numbers.payersByTier).toEqual([{ tier: "paid", count: 2 }]);
    expect(numbers.courtesies).toBe(1);
    expect(numbers.scheduledCancellations).toBe(1);
  });
});
