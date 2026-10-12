import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";
import { createDatabase } from "@/lib/db/database";
import { migrateDatabase } from "@/lib/db/migrate";

/* One Postgres for the whole integration run, migrated once, the same version as production. */

let container: StartedPostgreSqlContainer | undefined;

export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer("postgres:17-alpine").start();
  const databaseUrl = container.getConnectionUri();
  const db = createDatabase(databaseUrl);
  await migrateDatabase(db);
  await db.$client.end();
  project.provide("databaseUrl", databaseUrl);
}

export async function teardown() {
  await container?.stop();
}

declare module "vitest" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation requires an interface
  interface ProvidedContext {
    databaseUrl: string;
  }
}
