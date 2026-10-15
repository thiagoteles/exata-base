import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, describe, expect, inject, it } from "vitest";
import { createDatabase } from "@/lib/db/database";
import { migrateDatabase } from "@/lib/db/migrate";

/*
 * A database migrated before the base's and the product's migrations were apart: one record held
 * both. Each test gets a database of its own, beside the suite's, made the way such a database was.
 */

const admin = createDatabase(inject("databaseUrl"));
const opened: ReturnType<typeof createDatabase>[] = [];

afterAll(async () => {
  await Promise.all(opened.map((db) => db.$client.end()));
  await admin.$client.end();
});

const streams = (adopted: readonly string[]) => ({
  baseFolder: path.join(process.cwd(), "lib/db/migrations"),
  productFolder: path.join(process.cwd(), "lib/db/product-migrations"),
  adopted,
});

/** A new database holding the base's stream, with one product migration recorded among the base's. */
async function migratedAsOneStream(name: string) {
  await admin.execute(sql.raw(`create database ${name}`));
  const url = new URL(inject("databaseUrl"));
  url.pathname = `/${name}`;
  const db = createDatabase(url.toString());
  opened.push(db);
  await migrate(db, { migrationsFolder: streams([]).baseFolder });
  await db.execute(
    sql.raw(`insert into drizzle.__drizzle_migrations (hash, created_at) values ('product', 1)`),
  );
  return db;
}

/** Every migration of the product's stream, as a database migrated in one stream would hold them. */
const productTags = (
  JSON.parse(readFileSync(path.join(streams([]).productFolder, "meta/_journal.json"), "utf8")) as {
    entries: { tag: string }[];
  }
).entries.map((entry) => entry.tag);

const count = async (db: ReturnType<typeof createDatabase>, query: string) =>
  Number(((await db.execute(sql.raw(query))) as unknown as { n: string }[])[0]?.n);

describe("migrations in two streams", () => {
  it("takes a database migrated as one stream: the product's records move, nothing runs twice", async () => {
    const db = await migratedAsOneStream("one_stream_adopted");
    await migrateDatabase(db, streams(productTags));
    expect(await count(db, "select count(*) as n from drizzle.__product_migrations")).toBe(
      productTags.length,
    );
    expect(
      await count(
        db,
        "select count(*) as n from drizzle.__drizzle_migrations where created_at = 1",
      ),
    ).toBe(0);
    await migrateDatabase(db, streams(productTags));
    expect(await count(db, "select count(*) as n from drizzle.__product_migrations")).toBe(
      productTags.length,
    );
  });

  it("refuses to guess which product migrations such a database already holds", async () => {
    const db = await migratedAsOneStream("one_stream_unlisted");
    await expect(migrateDatabase(db, streams([]))).rejects.toThrow(/adopted-migrations/);
  });

  it("refuses an adopted migration the product's stream does not have", async () => {
    const db = await migratedAsOneStream("one_stream_unknown");
    await expect(migrateDatabase(db, streams(["0099_nothing"]))).rejects.toThrow(/0099_nothing/);
  });
});
