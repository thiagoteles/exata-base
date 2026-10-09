import { and, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { payments, plans } from "@/lib/db/schema/billing";
import { users } from "@/lib/db/schema/users";
import type { PaymentEvent } from "@/lib/ports/payment/types";

/*
 * The local record of payments, fed by the provider's charge events. A charge may arrive before
 * the checkout that ties its customer to a person; it is kept with the customer only and linked
 * when the checkout completes, so no payment is lost to the order of deliveries.
 */

export type Payment = typeof payments.$inferSelect;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function personOfCustomer(tx: Transaction, customerId: string | null) {
  if (customerId === null) {
    return null;
  }
  const [person] = await tx
    .select({ id: users.id, email: users.email })
    .from(plans)
    .innerJoin(users, eq(users.id, plans.userId))
    .where(eq(plans.providerCustomerId, customerId));
  return person ?? null;
}

/** A payment recorded for the first time, which is when it counts in the funnel. */
export type NewPayment = {
  payerId: string | null;
  method: string | null;
  cents: number;
  currency: string;
};

export async function recordPayment(
  tx: Transaction,
  event: Extract<PaymentEvent, { kind: "payment_succeeded" }>,
): Promise<NewPayment | null> {
  const person = await personOfCustomer(tx, event.customerId);
  const [recorded] = await tx
    .insert(payments)
    .values({
      provider: event.provider,
      providerPaymentId: event.paymentId,
      providerCustomerId: event.customerId,
      payerId: person?.id ?? null,
      payerEmail: person?.email ?? event.email,
      amountCents: event.amountCents,
      currency: event.currency,
      method: event.method,
      paidAt: event.paidAt,
    })
    .onConflictDoNothing({ target: payments.providerPaymentId })
    .returning({ payerId: payments.payerId });
  return recorded === undefined
    ? null
    : {
        payerId: recorded.payerId,
        method: event.method,
        cents: event.amountCents,
        currency: event.currency,
      };
}

/** What a refund added to a payment: how much, in which currency, and whose it was. */
export type NewRefund = { payerId: string | null; cents: number; currency: string };

export async function recordRefund(
  tx: Transaction,
  event: Extract<PaymentEvent, { kind: "charge_refunded" }>,
): Promise<NewRefund | null> {
  const [payment] = await tx
    .select()
    .from(payments)
    .where(eq(payments.providerPaymentId, event.paymentId))
    .for("update");
  if (payment === undefined) {
    return null;
  }
  const refundedCents = Math.min(event.refundedCents, payment.amountCents);
  await tx
    .update(payments)
    .set({
      refundedCents,
      status: refundedCents >= payment.amountCents ? "refunded" : "partially_refunded",
    })
    .where(eq(payments.id, payment.id));
  const added = refundedCents - payment.refundedCents;
  return added > 0 ? { payerId: payment.payerId, cents: added, currency: payment.currency } : null;
}

/** Ties the payments of a provider customer that arrived before the checkout to the person. */
export async function linkPayments(
  tx: Transaction,
  customerId: string,
  person: { id: string; email: string },
): Promise<void> {
  await tx
    .update(payments)
    .set({ payerId: person.id, payerEmail: person.email })
    .where(and(eq(payments.providerCustomerId, customerId), isNull(payments.payerId)));
}

/** A person's payments, newest first. */
export function paymentsOf(db: Database, payerId: string): Promise<Payment[]> {
  return db
    .select()
    .from(payments)
    .where(eq(payments.payerId, payerId))
    .orderBy(desc(payments.paidAt));
}
