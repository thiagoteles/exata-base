import { env } from "@/lib/env";
import { logger } from "@/lib/ports/log";
import { db } from "./client";
import { migrateDatabase } from "./migrate";
import { SEED_ADMIN_PASSWORD, seedDatabase } from "./seed";

/** Runs once when a server starts, before it answers: migrations always, the seed outside production. */
export async function prepareDatabase(): Promise<void> {
  await migrateDatabase(db);
  logger.info("database migrated");
  if (env.NODE_ENV !== "production") {
    const adminId = await seedDatabase(db);
    const { seedLocalPassword } = await import("@/lib/ports/auth");
    await seedLocalPassword(adminId, SEED_ADMIN_PASSWORD);
    logger.info("database seeded");
  }
}
