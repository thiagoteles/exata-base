import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type QueryTiming, timeQueries } from "./query-timing";

const POOL_SIZE = 10;

type DatabaseOptions = {
  /** Called for every query once it settles; the app keeps the slow ones. */
  onQuery?: (timing: QueryTiming) => void;
};

export function createDatabase(url: string, options: DatabaseOptions = {}) {
  const raw = postgres(url, { max: POOL_SIZE, onnotice: () => undefined });
  const client = options.onQuery === undefined ? raw : timeQueries(raw, options.onQuery);
  // No schema here: the app writes its queries with the query builder, and every page that reads
  // the database would otherwise carry every table. Each service imports the tables it uses.
  return drizzle({ client, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDatabase>;

/** A database or an open transaction: services take either, so callers decide the boundary. */
export type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];
