import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/ports/log";
import { createDatabase, type Database } from "./database";

/*
 * The app's database. One pool per server process; in development hot reload re-evaluates
 * modules, so the instance is kept on globalThis instead of opening a pool on every edit.
 */

const holder = globalThis as typeof globalThis & { appDatabase?: Database };

// Above this, a query is worth a line in the log: long enough to feel, rare enough to read.
const SLOW_QUERY_MS = 250;

export const db: Database =
  holder.appDatabase ??
  createDatabase(env.DATABASE_URL, {
    onQuery: ({ name, text, ms }) => {
      if (ms >= SLOW_QUERY_MS) {
        logger.warn("slow query", { query: name, ms: Math.round(ms), text });
      }
    },
  });

if (env.NODE_ENV !== "production") {
  holder.appDatabase = db;
}
