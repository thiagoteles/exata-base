import process from "node:process";
import { createDatabase } from "../lib/db/database";
import { migrateDatabase } from "../lib/db/migrate";

/*
 * Applies the pending migrations to the database the app uses, with the same lock the server
 * takes when it starts. `pnpm db:migrate` runs it inside the compose's app container, so a new
 * migration reaches the local database without restarting the development server.
 */

// biome-ignore lint/style/noProcessEnv: a repository script, outside the app and its environment rules
const url = process.env["DATABASE_URL"];
if (url === undefined || url === "") {
  process.stderr.write(
    "DATABASE_URL is not set. Run it through `pnpm db:migrate`, with the compose up.\n",
  );
  process.exit(1);
}
const db = createDatabase(url);
await migrateDatabase(db);
await db.$client.end();
process.stdout.write("Migrations applied.\n");
