import { remindAbandonedCheckouts } from "./abandoned-checkouts";
import { expireFixedTerms, warnExpiringTerms } from "./fixed-terms";
import { purgeExpiredInvites } from "./purge-invites";
import { purgeRateLimits } from "./purge-rate-limits";
import { grantPendingReferralCredits } from "./referral-credits";
import type { ScheduledOperation } from "./run";

/**
 * Every operation the host's calls run, each under the cadence it declares. A new one is added here
 * and nowhere else. A cadence that gets its first operation also needs its line in the host's cron
 * and in `ops/gcp/heartbeats.json`, which a test checks.
 */
export const scheduledOperations: readonly ScheduledOperation[] = [
  purgeExpiredInvites,
  purgeRateLimits,
  warnExpiringTerms,
  expireFixedTerms,
  remindAbandonedCheckouts,
  grantPendingReferralCredits,
];
