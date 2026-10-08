import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema/billing";
import { deleteProviderUser } from "@/lib/ports/auth";
import { logger } from "@/lib/ports/log";
import { paymentGateway } from "@/lib/ports/payment";
import { fileStorage } from "@/lib/ports/storage";
import type { DeletionSteps } from "./delete";

/*
 * The real steps behind deleteAccount. A subscription is ended before anything is deleted, so no
 * deleted person keeps being charged. With billing off and a subscription still on record, there
 * is nothing that can end it, so the deletion stops there.
 */
async function endSubscription(userId: string): Promise<void> {
  const [plan] = await db
    .select({ subscription: plans.stripeSubscriptionId })
    .from(plans)
    .where(eq(plans.userId, userId));
  if (plan?.subscription === null || plan === undefined) {
    return;
  }
  const gateway = await paymentGateway();
  if (gateway === null) {
    throw new Error("the account has a subscription and billing is off, so it cannot be ended");
  }
  await gateway.cancelSubscription(plan.subscription);
}

export const accountDeletionSteps: DeletionSteps = {
  cancelBilling: endSubscription,
  storage: fileStorage,
  deleteProviderUser,
  logger,
};
