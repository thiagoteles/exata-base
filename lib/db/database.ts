import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

const POOL_SIZE = 10;

export function createDatabase(url: string) {
  const client = postgres(url, { max: POOL_SIZE, onnotice: () => undefined });
  return drizzle({ client, schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDatabase>;

/** A database or an open transaction: services take either, so callers decide the boundary. */
export type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];
