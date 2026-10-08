import "server-only";
import { env } from "@/lib/env";
import { createDatabase, type Database } from "./database";

/*
 * The app's database. One pool per server process; in development hot reload re-evaluates
 * modules, so the instance is kept on globalThis instead of opening a pool on every edit.
 */

const holder = globalThis as typeof globalThis & { appDatabase?: Database };

export const db: Database = holder.appDatabase ?? createDatabase(env.DATABASE_URL);

if (env.NODE_ENV !== "production") {
  holder.appDatabase = db;
}
