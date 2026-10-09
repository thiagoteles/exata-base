import type postgres from "postgres";

/*
 * Times every query the app sends. Drizzle runs each statement through the client's `unsafe`, and
 * a transaction or a savepoint hands its callback a client of its own, so those are wrapped too.
 * Only the statement text is reported, never the values: Drizzle sends every value as a parameter.
 */

export type QueryTiming = { name: string; text: string; ms: number };

const TEXT_LIMIT = 300;
const space = /\s+/g;
const verbs: readonly [RegExp, string][] = [
  [/^insert\s+into\s+"?([\w.]+)"?/i, "insert"],
  [/^update\s+"?([\w.]+)"?/i, "update"],
  [/^delete\s+from\s+"?([\w.]+)"?/i, "delete"],
  [/^(?:select|with)\b[\s\S]*?\bfrom\s+"?([\w.]+)"?/i, "select"],
];

/** A short name to search the log by: the command and the main table, like "select users". */
export function describeQuery(text: string): { name: string; text: string } {
  const flat = text.replace(space, " ").trim();
  const found = verbs.find(([pattern]) => pattern.test(flat));
  const table = found === undefined ? undefined : found[0].exec(flat)?.[1];
  const verb = found?.[1] ?? flat.split(" ")[0]?.toLowerCase() ?? "query";
  return { name: table === undefined ? verb : `${verb} ${table}`, text: flat.slice(0, TEXT_LIMIT) };
}

type Report = (timing: QueryTiming) => void;
type Unsafe = postgres.Sql["unsafe"];
type Scope = (sql: never) => unknown;

function timedUnsafe(unsafe: Unsafe, report: Report): Unsafe {
  return ((text: string, ...rest: unknown[]) => {
    const query = (unsafe as (...args: unknown[]) => ReturnType<Unsafe>)(text, ...rest);
    const started = performance.now();
    // A second listener on the same query: it does not change what the caller receives.
    const done = () => report({ ...describeQuery(text), ms: performance.now() - started });
    query.then(done, done);
    return query;
  }) as Unsafe;
}

function wrap<T extends object>(sql: T, report: Report): T {
  return new Proxy(sql, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property);
      if (property === "unsafe" && typeof value === "function") {
        return timedUnsafe(value as Unsafe, report);
      }
      if ((property === "begin" || property === "savepoint") && typeof value === "function") {
        return (...args: unknown[]) => {
          const callback = args.at(-1) as Scope;
          const scoped: Scope = (inner) => callback(wrap(inner as object, report) as never);
          return (value as (...all: unknown[]) => unknown)(...args.slice(0, -1), scoped);
        };
      }
      return value;
    },
  });
}

/** The client, with every query reported once it settles. */
export function timeQueries<T extends postgres.Sql>(sql: T, report: Report): T {
  return wrap(sql, report);
}
