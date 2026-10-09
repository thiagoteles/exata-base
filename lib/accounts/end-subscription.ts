import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/database";
import { plans } from "@/lib/db/schema/billing";
import type { PaymentGateway } from "@/lib/ports/payment/types";

/**
 * Ends the person's subscription at the provider, so a deleted person is never charged again. No
 * subscription is nothing to do. With one on record and no gateway (billing off) nothing can end
 * it, so this throws and the deletion stops before it deletes anything.
 */
export async function endSubscriptionOf(
  db: Database,
  gateway: () => Promise<PaymentGateway | null>,
  userId: string,
): Promise<void> {
  const [plan] = await db
    .select({ subscription: plans.providerSubscriptionId })
    .from(plans)
    .where(eq(plans.userId, userId));
  if (plan === undefined || plan.subscription === null) {
    return;
  }
  const provider = await gateway();
  if (provider === null) {
    throw new Error("the account has a subscription and billing is off, so it cannot be ended");
  }
  await provider.cancelSubscription(plan.subscription);
}
