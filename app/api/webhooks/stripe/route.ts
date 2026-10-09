import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { currentInstant } from "@/domain/clock";
import { applyPaymentEvent, type Effects } from "@/lib/billing/events";
import { sendTrialEnding } from "@/lib/billing/mailer";
import { cacheTags } from "@/lib/cache-tags";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { sendEvent } from "@/lib/ports/analytics";
import { logger } from "@/lib/ports/log";
import { paymentGateway } from "@/lib/ports/payment";
import type { PaymentGateway } from "@/lib/ports/payment/types";
import { readPreferences } from "@/lib/preferences/service";
import { grantReferralCredits } from "@/lib/referral/credit";
import { timedRoute } from "@/lib/timed-route";

/** What a delivery caused, done once it is committed: events to count, an e-mail to send. */
async function announce(effects: Effects, gateway: PaymentGateway): Promise<void> {
  if (effects.dispute !== null) {
    // An error on purpose: the error reporter turns it into an alert, and a dispute has a deadline.
    logger.error("payment disputed", {
      paymentId: effects.dispute.paymentId,
      amountCents: effects.dispute.amountCents,
      reason: effects.dispute.reason,
      recorded: effects.dispute.known,
    });
  }
  if (effects.checkoutCompleted !== null) {
    const { userId, interval, source } = effects.checkoutCompleted;
    sendEvent({
      name: "checkout_completed",
      accountId: userId,
      data: { interval, source },
    });
  }
  const payer = effects.newPayment?.payerId;
  if (payer !== null && payer !== undefined) {
    // An invited person's first payment earns their inviter a credit. A failure is only logged: the
    // daily call tries again, and the payment itself is already recorded.
    await grantReferralCredits(db, gateway, { now: currentInstant(), referredId: payer }).catch(
      (error: unknown) => logger.error("referral credit not granted", { error }),
    );
  }
  if (effects.trialStarted !== null) {
    sendEvent({
      name: "trial_started",
      accountId: effects.trialStarted.userId,
      data: { interval: effects.trialStarted.interval },
    });
  }
  const payerId = effects.refund?.payerId;
  if (effects.refund !== null && payerId !== null && payerId !== undefined) {
    sendEvent({
      name: "refund_issued",
      accountId: payerId,
      data: { cents: effects.refund.cents, currency: effects.refund.currency.toUpperCase() },
    });
  }
  if (effects.trialEnding !== null) {
    const { userId, email, name, endsAt } = effects.trialEnding;
    const { timeZone, locale } = await readPreferences(db, userId);
    const sent = await sendTrialEnding({
      to: email,
      name,
      endsOn: formatInstantDate(endsAt, timeZone),
      locale,
    });
    if (!sent) {
      logger.warn("trial ending notice not sent", { userId });
    }
  }
}

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
  if (event.kind === "prices_changed") {
    // The prices on the plans page are cached by tag; a change at the provider expires them now.
    revalidateTag(cacheTags.prices(), "max");
    return Response.json({ result: "applied" });
  }
  const { status, newPayment, effects } = await applyPaymentEvent(
    db,
    event,
    gateway.cancelSubscription,
  );
  // A payment counts in the funnel once, when it is first recorded, and only when it has an account.
  if (newPayment !== null && newPayment.payerId !== null) {
    sendEvent({
      name: "payment_confirmed",
      accountId: newPayment.payerId,
      data: {
        method: newPayment.method ?? "unknown",
        cents: newPayment.cents,
        revenue: newPayment.cents / 100,
        currency: newPayment.currency.toUpperCase(),
      },
    });
  }
  await announce(effects, gateway);
  return Response.json({ result: status });
});
