import { purgeExpiredInvites } from "./purge-invites";
import { purgeRateLimits } from "./purge-rate-limits";
import type { DailyOperation } from "./run";

/** Every operation the daily call runs. A new one is added here and nowhere else. */
export const dailyOperations: readonly DailyOperation[] = [purgeExpiredInvites, purgeRateLimits];
