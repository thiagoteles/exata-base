import { runsLocally } from "@/lib/env";
import { logger } from "@/lib/ports/log";
import { db } from "./client";
import { migrateDatabase } from "./migrate";
import { checkPlanTiers } from "./plan-tiers";
import { SEED_ADMIN_PASSWORD, seedDatabase } from "./seed";

/** Runs once when a server starts, before it answers: migrations always, the seed on this machine only. */
export async function prepareDatabase(): Promise<void> {
  await migrateDatabase(db);
  await checkPlanTiers(db);
  logger.info("database migrated");
  if (runsLocally) {
    const adminId = await seedDatabase(db);
    const { seedLocalPassword } = await import("@/lib/ports/auth");
    await seedLocalPassword(adminId, SEED_ADMIN_PASSWORD);
    logger.info("database seeded");
  }
}
