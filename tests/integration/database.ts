import { getTableName, sql } from "drizzle-orm";
import { afterAll, beforeEach, inject } from "vitest";
import { createDatabase } from "@/lib/db/database";
import { tables } from "@/lib/db/schema";

/** A database for one test file, emptied before each test. */
export function testDatabase() {
  const db = createDatabase(inject("databaseUrl"));
  const names = tables.map((table) => `"${getTableName(table)}"`).join(", ");

  beforeEach(async () => {
    await db.execute(sql.raw(`truncate ${names} cascade`));
  });

  afterAll(async () => {
    await db.$client.end();
  });

  return db;
}
