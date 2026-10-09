import { paymentGateway } from "@/lib/ports/payment";
import { grantReferralCredits } from "@/lib/referral/credit";
import type { ScheduledOperation } from "./run";

/**
 * Credits the inviters whose invited person has paid and who were not credited yet: the retry for any
 * credit the payment's own webhook could not make. Without a payment provider there is nothing to
 * credit. Running it twice in a row grants nothing the second time, because the arrival is claimed.
 */
export const grantPendingReferralCredits: ScheduledOperation = {
  cadence: "daily",
  name: "grant-referral-credits",
  async run({ db, now }) {
    const gateway = await paymentGateway();
    if (gateway === null) {
      return { granted: 0, failed: 0 };
    }
    return grantReferralCredits(db, gateway, { now });
  },
};
