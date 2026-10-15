import { defineConfig } from "drizzle-kit";
import { baseSchemaFiles } from "./lib/db/base-schema";

// The base's own stream: only the base runs it (`pnpm db:generate:base`). It needs no database.
export default defineConfig({
  dialect: "postgresql",
  schema: baseSchemaFiles.map((file) => `./lib/db/schema/${file}`),
  out: "./lib/db/migrations",
  casing: "snake_case",
  strict: true,
  verbose: true,
});
