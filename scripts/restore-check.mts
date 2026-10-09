import process from "node:process";
import { getTableName } from "drizzle-orm";
import { createDatabase } from "../lib/db/database";
import { migrateDatabase } from "../lib/db/migrate";
import { tables } from "../lib/db/schema";

/*
 * Run by the restore drill against the restored copy: applies the migrations the dump does not
 * have yet, then counts every table, so a restore that came back empty or partial shows at once.
 */

const [url] = process.argv.slice(2);
if (url === undefined) {
  process.stderr.write("Pass the database URL of the restored copy.\n");
  process.exit(1);
}
const db = createDatabase(url);
await migrateDatabase(db);
const counts = await Promise.all(
  tables.map(async (table) => {
    const name = getTableName(table);
    const [row] = await db.execute<{ count: string }>(
      `select count(*)::text as count from "${name}"`,
    );
    return [name, Number(row?.count ?? 0)] as const;
  }),
);
for (const [name, count] of counts.sort()) {
  process.stdout.write(`${name.padEnd(24)} ${count}\n`);
}
const users = counts.find(([name]) => name === "users")?.[1] ?? 0;
await db.$client.end();
if (users === 0) {
  process.stderr.write(
    "The restored copy has no users: the dump is empty or the restore failed.\n",
  );
  process.exit(1);
}
