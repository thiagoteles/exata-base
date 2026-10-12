import { db } from "@/lib/db/client";
import { deleteProviderUser } from "@/lib/ports/auth";
import { logger } from "@/lib/ports/log";
import { paymentGateway } from "@/lib/ports/payment";
import { fileStorage } from "@/lib/ports/storage";
import type { DeletionSteps } from "./delete";
import { endSubscriptionOf } from "./end-subscription";

/*
 * The real steps behind deleteAccount. A subscription is ended before anything is deleted, so no
 * deleted person keeps being charged.
 */
export const accountDeletionSteps: DeletionSteps = {
  cancelBilling: (userId) => endSubscriptionOf(db, paymentGateway, userId),
  storage: fileStorage,
  deleteProviderUser,
  logger,
};
