import type { NextRequest } from "next/server";
import { applyPaymentEvent } from "@/lib/billing/service";
import { db } from "@/lib/db/client";
import { sendEvent } from "@/lib/ports/analytics";
import { logger } from "@/lib/ports/log";
import { paymentGateway } from "@/lib/ports/payment";
import { timedRoute } from "@/lib/timed-route";

/** The payment provider's events. The signature is checked on the raw body before anything is read. */
export const POST = timedRoute("/api/webhooks/stripe", async (request: NextRequest) => {
  const gateway = await paymentGateway();
  if (gateway === null) {
    // Billing is off: the route exists but accepts nothing.
    return new Response(null, { status: 404 });
  }
  const body = await request.text();
  let event: ReturnType<typeof gateway.readEvent>;
  try {
    event = gateway.readEvent(body, request.headers.get("stripe-signature") ?? "");
  } catch (error) {
    logger.warn("payment webhook refused: invalid signature", { error });
    return new Response(null, { status: 400 });
  }
  const { status, newPayment } = await applyPaymentEvent(db, event, gateway.cancelSubscription);
  // A payment counts in the funnel once, when it is first recorded, and only when it has an account.
  if (newPayment !== null && newPayment.payerId !== null) {
    sendEvent({
      name: "payment_confirmed",
      accountId: newPayment.payerId,
      data: { method: newPayment.method ?? "unknown", cents: newPayment.cents },
    });
  }
  return Response.json({ result: status });
});
