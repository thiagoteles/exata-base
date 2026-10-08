import { vi } from "vitest";
import { applyPaymentEvent } from "@/lib/billing/service";
import type { Database } from "@/lib/db/database";
import { createStripeGateway } from "@/lib/ports/payment/adapters/stripe";
import { createUser } from "./factories";
import { checkoutCompleted, sign, webhookSecret } from "./stripe-events";

export const gateway = createStripeGateway({ secretKey: "sk_test_unused", webhookSecret });

/** Builds the two moves every billing test needs, against one database. */
export function billingFixture(db: Database) {
  /** Signs the event, has the adapter verify and read it, and applies it like the route does. */
  async function deliver(
    payload: Record<string, unknown>,
    cancel = vi.fn(() => Promise.resolve()),
  ) {
    const { body, signature } = sign(payload);
    return {
      result: await applyPaymentEvent(db, gateway.readEvent(body, signature), cancel),
      cancel,
    };
  }

  async function subscriber(email = "ana@example.com", interval = "monthly") {
    const user = await createUser(db, email);
    await deliver(
      checkoutCompleted(`evt_buy_${user.id}`, {
        userId: user.id,
        interval,
        customer: `cus_${user.id}`,
        subscription: `sub_${user.id}`,
      }),
    );
    return user;
  }

  return { deliver, subscriber };
}
