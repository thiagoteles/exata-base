import { getTableColumns, getTableName } from "drizzle-orm";
import { type AnyPgColumn, getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { exportedData, notExportedData } from "./personal-data";
import { tables } from "./schema";
import { users } from "./schema/users";

/*
 * The rules every table follows. A new table that breaks one fails here, before a migration is
 * written: these are the rules that are easy to forget and expensive to fix later.
 */

const trailingId = /Id$/;

// Tables that do not have the standard id and timestamps, and why.
const conventionExceptions: Record<string, string> = {
  plans: "one row per user: the primary key is the user id",
  clerk_events: "keyed by the provider's event id, which is the replay lock",
  payment_events: "keyed by the provider's event id, which is the replay lock",
  staff_audit_log: "append-only, never updated",
  account_deletions: "append-only, never updated",
  rate_limits: "keyed by the hash of limit, subject and window; a row lives for one window",
  job_runs: "one row per job, keyed by its name and overwritten on every run",
};

function userKeys(table: PgTable) {
  return getTableConfig(table).foreignKeys.filter((key) => key.reference().foreignTable === users);
}

function columnKey(table: PgTable, column: AnyPgColumn): string {
  const entry = Object.entries(getTableColumns(table)).find(
    ([, candidate]) => candidate === column,
  );
  return entry?.[0] ?? "";
}

function isIndexed(table: PgTable, column: AnyPgColumn): boolean {
  const config = getTableConfig(table);
  const indexed = config.indexes.some((index) => {
    const [first] = index.config.columns;
    return first !== undefined && "name" in first && first.name === column.name;
  });
  return (
    indexed ||
    column.isUnique ||
    column.primary ||
    config.primaryKeys.some((key) => key.columns[0] === column)
  );
}

describe("schema conventions", () => {
  it.each(tables.map((table) => [getTableName(table), table] as const))(
    "%s has an id and timestamps",
    (name, table) => {
      if (conventionExceptions[name] !== undefined) {
        return;
      }
      const columns = getTableColumns(table);
      expect(columns["id"]?.columnType).toBe("PgUUID");
      expect(columns["id"]?.primary).toBe(true);
      expect(columns["createdAt"]?.notNull).toBe(true);
      expect(columns["updatedAt"]?.notNull).toBe(true);
    },
  );

  it("lists exceptions only for tables that exist", () => {
    const names = new Set(tables.map(getTableName));
    expect(Object.keys(conventionExceptions).filter((name) => !names.has(name))).toEqual([]);
  });

  it("indexes every foreign key", () => {
    const missing = tables.flatMap((table) =>
      getTableConfig(table)
        .foreignKeys.flatMap((key) => key.reference().columns)
        .filter((column) => !isIndexed(table, column))
        .map((column) => `${getTableName(table)}.${column.name}`),
    );
    expect(missing).toEqual([]);
  });

  it("gives every key to users a deletion policy", () => {
    const wrong = tables.flatMap((table) =>
      userKeys(table)
        .filter((key) => key.onDelete !== "cascade" && key.onDelete !== "set null")
        .map(() => getTableName(table)),
    );
    expect(wrong).toEqual([]);
  });

  it("keeps the author's e-mail next to every key that becomes null", () => {
    const missing = tables.flatMap((table) =>
      userKeys(table)
        .filter((key) => key.onDelete === "set null")
        .flatMap((key) => key.reference().columns)
        .map((column) => columnKey(table, column))
        .filter(
          (key) => getTableColumns(table)[`${key.replace(trailingId, "")}Email`] === undefined,
        )
        .map((key) => `${getTableName(table)}.${key}`),
    );
    expect(missing).toEqual([]);
  });

  it("decides, for every table a person owns, whether it goes in the account export", () => {
    const owning = tables.filter((table) =>
      userKeys(table).some((key) => key.onDelete === "cascade"),
    );
    const listed = [
      ...exportedData.map(({ table }) => table),
      ...notExportedData.map(({ table }) => table),
    ];
    expect(owning.filter((table) => !listed.includes(table)).map(getTableName)).toEqual([]);
    expect(new Set(listed).size).toBe(listed.length);
  });
});
