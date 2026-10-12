import { defineConfig } from "drizzle-kit";

// Only `drizzle-kit generate` uses this file, and generating needs no database connection.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/*.ts",
  out: "./lib/db/migrations",
  casing: "snake_case",
  strict: true,
  verbose: true,
});
