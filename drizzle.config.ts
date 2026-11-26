import { readdirSync } from "node:fs";
import { defineConfig } from "drizzle-kit";
import { baseSchemaFiles } from "./lib/db/base-schema";

/*
 * The product's stream: every schema file that is not one of the base's tables, migrated into a
 * folder and a record of its own, so the base's migrations and the product's never share a journal.
 * `pnpm db:generate` uses this file, and generating needs no database connection.
 */
const base = new Set<string>(baseSchemaFiles);
const productFiles = readdirSync("./lib/db/schema")
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts") && !base.has(file))
  .map((file) => `./lib/db/schema/${file}`);

export default defineConfig({
  dialect: "postgresql",
  // A product that took the samples out before making an area of its own has no file here yet,
  // and drizzle-kit refuses an empty list; the product's registry then declares no table, and
  // standing in for the files it lets the migration that drops the samples be written.
  schema: productFiles.length > 0 ? productFiles : ["./lib/db/schema.product.ts"],
  out: "./lib/db/product-migrations",
  casing: "snake_case",
  strict: true,
  verbose: true,
});
