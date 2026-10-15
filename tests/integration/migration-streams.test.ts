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

type Journal = { entries: { tag: string; when: number }[] };
const journal = (folder: string) =>
  JSON.parse(readFileSync(path.join(folder, "meta/_journal.json"), "utf8")) as Journal;

/** Every migration of the product's stream, as a database migrated in one stream would hold them. */
const productTags = journal(streams([]).productFolder).entries.map((entry) => entry.tag);

/** When the base's last migration of the one-stream era was made; products came after it. */
const oneStreamEnd =
  journal(streams([]).baseFolder).entries.find((entry) => entry.tag === "0023_lean_jack_flag")
    ?.when ?? 0;
const AFTER = oneStreamEnd + 1000;
const BEFORE = oneStreamEnd - 1000;

/** A new database holding the base's stream, with one record the base's journal does not know. */
async function migratedAsOneStream(name: string, recordedAt: number) {
  await admin.execute(sql.raw(`create database ${name}`));
  const url = new URL(inject("databaseUrl"));
  url.pathname = `/${name}`;
  const db = createDatabase(url.toString());
  opened.push(db);
  await migrate(db, { migrationsFolder: streams([]).baseFolder });
  await db.execute(
    sql.raw(
      `insert into drizzle.__drizzle_migrations (hash, created_at) values ('unknown', ${recordedAt})`,
    ),
  );
  return db;
}

const count = async (db: ReturnType<typeof createDatabase>, query: string) =>
  Number(((await db.execute(sql.raw(query))) as unknown as { n: string }[])[0]?.n);
const productRecords = (db: ReturnType<typeof createDatabase>) =>
  count(db, "select count(*) as n from drizzle.__product_migrations");
const baseRecordsAt = (db: ReturnType<typeof createDatabase>, moment: number) =>
  count(db, `select count(*) as n from drizzle.__drizzle_migrations where created_at = ${moment}`);

describe("migrations in two streams", () => {
  it("takes a database migrated as one stream: the product's records move, nothing runs twice", async () => {
    const db = await migratedAsOneStream("one_stream_adopted", AFTER);
    await migrateDatabase(db, streams(productTags));
    expect(await productRecords(db)).toBe(productTags.length);
    expect(await baseRecordsAt(db, AFTER)).toBe(0);
    await migrateDatabase(db, streams(productTags));
    expect(await productRecords(db)).toBe(productTags.length);
  });

  it("leaves alone an old record of the base's own development, from before the products", async () => {
    const db = await migratedAsOneStream("one_stream_leftover", BEFORE);
    await migrateDatabase(db, streams([]));
    expect(await baseRecordsAt(db, BEFORE)).toBe(1);
    expect(await productRecords(db)).toBe(productTags.length);
  });

  it("refuses to guess which product migrations such a database already holds", async () => {
    const db = await migratedAsOneStream("one_stream_unlisted", AFTER);
    await expect(migrateDatabase(db, streams([]))).rejects.toThrow(/adopted-migrations/);
  });

  it("refuses an adopted migration the product's stream does not have", async () => {
    const db = await migratedAsOneStream("one_stream_unknown", AFTER);
    await expect(migrateDatabase(db, streams(["0099_nothing"]))).rejects.toThrow(/0099_nothing/);
  });
});
