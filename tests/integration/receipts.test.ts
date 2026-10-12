import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { payments } from "@/lib/db/schema/billing";
import { receiptFacts, receiptForPayer } from "@/lib/documents/receipts";
import { DomainError } from "@/lib/errors";
import { testDatabase } from "./database";
import { createUser } from "./factories";

const db = testDatabase();

async function payment(payerId: string | null, status: "paid" | "refunded" = "paid") {
  const [row] = await db
    .insert(payments)
    .values({
      provider: "stripe",
      providerPaymentId: `ch_${crypto.randomUUID()}`,
      payerId,
      payerEmail: "ana@example.com",
      amountCents: 2900,
      currency: "brl",
      method: "pix",
      status,
      paidAt: new Date("2026-10-01T12:00:00Z"),
    })
    .returning();
  if (row === undefined) {
    throw new Error("payment was not created");
  }
  return row;
}

const statusOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 200;
  } catch (error) {
    return error instanceof DomainError ? error.status : 500;
  }
};

describe("a receipt", () => {
  it("is made for the payer's own settled payment", async () => {
    const ana = await createUser(db, "ana@example.com");
    const paid = await payment(ana.id);
    expect(await receiptForPayer(db, ana.id, paid.id)).toMatchObject({
      id: paid.id,
      amountCents: 2900,
      currency: "brl",
      method: "pix",
    });
  });

  it("is a 404 for someone else's payment, a refunded one, or one that does not exist", async () => {
    const ana = await createUser(db, "ana@example.com");
    const bia = await createUser(db, "bia@example.com");
    const hers = await payment(bia.id);
    const refunded = await payment(ana.id, "refunded");
    expect(await statusOf(receiptForPayer(db, ana.id, hers.id))).toBe(404);
    expect(await statusOf(receiptForPayer(db, ana.id, refunded.id))).toBe(404);
    expect(await statusOf(receiptForPayer(db, ana.id, crypto.randomUUID()))).toBe(404);
  });

  it("shows on verification the payment as it is now, and nothing about who paid", async () => {
    const ana = await createUser(db, "ana@example.com");
    const paid = await payment(ana.id);
    await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, paid.id));
    const facts = await receiptFacts(db, paid.id);
    expect(facts?.status).toBe("refunded");
    expect(JSON.stringify(facts)).not.toContain("ana@example.com");
    expect(await receiptFacts(db, crypto.randomUUID())).toBeNull();
  });
});
