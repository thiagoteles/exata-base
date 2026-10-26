import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { tierNames } from "../domain/billing/entitlements";
import { addTierStatements, tiersInMigrations } from "../lib/db/plan-tiers";

/*
 * Writes the product migration that adds to the database type the tiers the catalog sells and the
 * migrations do not add yet. It reads the migrations, not a database, so it runs anywhere. A tier
 * taken out of the catalog stays in the type, unused; plans still on it are moved by hand.
 */

const folders = ["lib/db/migrations", "lib/db/product-migrations"];
const sqlFiles = (folder: string) =>
  readdirSync(folder)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => path.join(folder, file));

const known = tiersInMigrations(
  folders.flatMap(sqlFiles).map((file) => readFileSync(file, "utf8")),
);
const missing = tierNames.filter((tier) => !known.has(tier));
if (missing.length === 0) {
  process.stdout.write("Nothing to do: the migrations already add every tier the catalog sells.\n");
  process.exit(0);
}

const before = new Set(sqlFiles("lib/db/product-migrations"));
execFileSync("pnpm", ["exec", "drizzle-kit", "generate", "--custom", "--name", "plan_tiers"], {
  stdio: "inherit",
});
const [written] = sqlFiles("lib/db/product-migrations").filter((file) => !before.has(file));
if (written === undefined) {
  process.stderr.write("drizzle-kit wrote no migration; run pnpm db:generate --custom yourself.\n");
  process.exit(1);
}
writeFileSync(written, `${addTierStatements(missing)}\n`);
// drizzle-kit leaves its snapshots unformatted, and the lint reads them.
execFileSync("pnpm", ["exec", "biome", "format", "--write", "lib/db/product-migrations"], {
  stdio: "inherit",
});
process.stdout.write(`${written} adds ${missing.join(", ")}. Apply it with pnpm db:migrate.\n`);
