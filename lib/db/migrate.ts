import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import adoptedMigrations from "./adopted-migrations.product.json" with { type: "json" };
import type { Database } from "./database";

// Any constant works; it only has to be the same in every instance of the app.
const MIGRATION_LOCK = 72_431_906;

const SCHEMA = "drizzle";
const BASE_TABLE = "__drizzle_migrations";
const PRODUCT_TABLE = "__product_migrations";

/*
 * Two streams of migrations, each with its own journal and its own record in the database: the
 * base's (`lib/db/migrations`), which only the base writes, and the product's
 * (`lib/db/product-migrations`). Drizzle applies a migration only when it is newer than the last one
 * recorded, so one journal shared by a base that merges into many products would skip a base
 * migration made before the product's latest; apart, each stream only ever grows at its own end.
 */
export type MigrationStreams = {
  baseFolder: string;
  productFolder: string;
  /**
   * The product's migrations a database already holds from before the streams were apart, when
   * one journal held both. They are recorded as applied, never run, the first time the product's
   * stream meets such a database.
   */
  adopted: readonly string[];
};

const defaultStreams = (): MigrationStreams => ({
  baseFolder: path.join(process.cwd(), "lib/db/migrations"),
  productFolder: path.join(process.cwd(), "lib/db/product-migrations"),
  adopted: adoptedMigrations.adopted,
});

type Journal = { entries: { tag: string; when: number }[] };
const journalOf = (folder: string): Journal =>
  JSON.parse(readFileSync(path.join(folder, "meta/_journal.json"), "utf8")) as Journal;

type Connection = Awaited<ReturnType<Database["$client"]["reserve"]>>;

/**
 * A database migrated before the streams were apart has the product's migrations recorded among
 * the base's. The first time, those records leave the base's table and the product's stream starts
 * with the migrations the product declares it already holds, so nothing is made twice and no base
 * migration is ever skipped for being older than a product's.
 */
async function adoptOneStream(connection: Connection, streams: MigrationStreams) {
  const [found] = await connection<{ base: string | null; product: string | null }[]>`
    select to_regclass(${`${SCHEMA}.${BASE_TABLE}`})::text as base,
           to_regclass(${`${SCHEMA}.${PRODUCT_TABLE}`})::text as product`;
  if (found?.base === null || found?.base === undefined || found.product !== null) {
    return;
  }
  const baseMoments = new Set(journalOf(streams.baseFolder).entries.map((entry) => entry.when));
  const rows = await connection<{ id: number; created_at: string }[]>`
    select id, created_at from ${connection(SCHEMA)}.${connection(BASE_TABLE)}`;
  const foreign = rows.filter((row) => !baseMoments.has(Number(row.created_at)));
  if (foreign.length === 0) {
    return;
  }
  if (streams.adopted.length === 0) {
    throw new Error(
      "The database holds the product's migrations in the base's record, from before the streams " +
        "were apart. List the product migrations it already holds in " +
        "lib/db/adopted-migrations.product.json, so they are recorded and not run again.",
    );
  }
  const tags = journalOf(streams.productFolder).entries.map((entry) => entry.tag);
  const files = readMigrationFiles({ migrationsFolder: streams.productFolder });
  const adopted = streams.adopted.map((tag) => {
    const file = files[tags.indexOf(tag)];
    if (file === undefined) {
      throw new Error(`${tag} is listed as adopted but is not a migration of the product's stream`);
    }
    return file;
  });
  // One transaction on the reserved connection, which holds the lock: all of it, or none.
  await connection`begin`;
  try {
    await connection`create schema if not exists ${connection(SCHEMA)}`;
    await connection`create table ${connection(SCHEMA)}.${connection(PRODUCT_TABLE)} (
      id serial primary key, hash text not null, created_at bigint)`;
    const records = adopted.map((file) => ({ hash: file.hash, created_at: file.folderMillis }));
    await connection`insert into ${connection(SCHEMA)}.${connection(PRODUCT_TABLE)} ${connection(records, "hash", "created_at")}`;
    await connection`delete from ${connection(SCHEMA)}.${connection(BASE_TABLE)} where id in ${connection(foreign.map((row) => row.id))}`;
    await connection`commit`;
  } catch (error) {
    await connection`rollback`;
    throw error;
  }
}

/**
 * Applies pending migrations: the base's stream, then the product's, whose tables may point at the
 * base's. An advisory lock makes a second instance starting at the same time wait instead of
 * running the same migration twice.
 */
export async function migrateDatabase(
  db: Database,
  streams: MigrationStreams = defaultStreams(),
): Promise<void> {
  const connection = await db.$client.reserve();
  try {
    await connection`select pg_advisory_lock(${MIGRATION_LOCK})`;
    await adoptOneStream(connection, streams);
    await migrate(db, { migrationsFolder: streams.baseFolder });
    await migrate(db, {
      migrationsFolder: streams.productFolder,
      migrationsSchema: SCHEMA,
      migrationsTable: PRODUCT_TABLE,
    });
  } finally {
    await connection`select pg_advisory_unlock(${MIGRATION_LOCK})`;
    connection.release();
  }
}
