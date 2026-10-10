import { and, eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { payments } from "@/lib/db/schema/billing";
import { DomainError } from "@/lib/errors";

/*
 * Receipts are made from payments, never stored. A person may take a receipt only for a payment of
 * their own that is settled; anyone with the signed address may read what it certifies, which is
 * the payment and nothing about who paid.
 */

export type ReceiptFacts = {
  id: string;
  amountCents: number;
  refundedCents: number;
  currency: string;
  method: string | null;
  status: (typeof payments.$inferSelect)["status"];
  paidAt: Date;
};

const facts = {
  id: payments.id,
  amountCents: payments.amountCents,
  refundedCents: payments.refundedCents,
  currency: payments.currency,
  method: payments.method,
  status: payments.status,
  paidAt: payments.paidAt,
};

/** The facts of one of the person's own paid payments, or a 404 for any other. */
export async function receiptForPayer(
  db: Database,
  payerId: string,
  paymentId: string,
): Promise<ReceiptFacts> {
  const [row] = await db
    .select(facts)
    .from(payments)
    .where(
      and(eq(payments.id, paymentId), eq(payments.payerId, payerId), eq(payments.status, "paid")),
    );
  if (row === undefined) {
    throw new DomainError(404);
  }
  return row;
}

/** What the verification page shows for a payment, whatever its state now. Null when it is gone. */
export async function receiptFacts(db: Database, paymentId: string): Promise<ReceiptFacts | null> {
  const [row] = await db.select(facts).from(payments).where(eq(payments.id, paymentId));
  return row ?? null;
}
