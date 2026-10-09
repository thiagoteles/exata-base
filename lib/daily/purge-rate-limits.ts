import { lt } from "drizzle-orm";
import { rateLimits } from "@/lib/db/schema/rate-limits";
import type { DailyOperation } from "./run";

/** Deletes the counters of windows that already ended. Running it twice deletes nothing new. */
export const purgeRateLimits: DailyOperation = {
  name: "purge-rate-limits",
  async run({ db, now }) {
    const removed = await db
      .delete(rateLimits)
      .where(lt(rateLimits.expiresAt, now))
      .returning({ key: rateLimits.key });
    return { removed: removed.length };
  },
};
