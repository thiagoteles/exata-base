import path from "node:path";
import process from "node:process";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Database } from "./database";

// Any constant works; it only has to be the same in every instance of the app.
const MIGRATION_LOCK = 72_431_906;

const migrationsFolder = path.join(process.cwd(), "lib/db/migrations");

/**
 * Applies pending migrations. An advisory lock makes a second instance starting at the same time
 * wait instead of running the same migration twice.
 */
export async function migrateDatabase(db: Database): Promise<void> {
  const connection = await db.$client.reserve();
  try {
    await connection`select pg_advisory_lock(${MIGRATION_LOCK})`;
    await migrate(db, { migrationsFolder });
  } finally {
    await connection`select pg_advisory_unlock(${MIGRATION_LOCK})`;
    connection.release();
  }
}
