import { getTableColumns, getTableName } from "drizzle-orm";
import {
  type AnyPgColumn,
  doublePrecision,
  getTableConfig,
  isPgEnum,
  numeric,
  type PgTable,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { exportedData, notExportedData } from "./personal-data";
import { schema, tables } from "./schema";
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

const money = /price|amount|cents|total|cost|fee|balance|revenue|refund|salary|value/i;
const approximate = new Set(["PgReal", "PgDoublePrecision", "PgNumeric", "PgNumericNumber"]);
const timestamps = new Set(["PgTimestamp", "PgTimestampString"]);
const snakeCase = /^[a-z][a-z0-9_]*$/;

/** Money is integer cents: a float or a decimal with a money name is how a cent goes missing. */
function inexactMoney(list: readonly PgTable[]): string[] {
  return list.flatMap((table) =>
    Object.entries(getTableColumns(table))
      .filter(([key, column]) => approximate.has(column.columnType) && money.test(key))
      .map(([key]) => `${getTableName(table)}.${key}`),
  );
}

/** An instant without a zone means a different moment on every server that reads it. */
function zonelessInstants(list: readonly PgTable[]): string[] {
  return list.flatMap((table) =>
    Object.entries(getTableColumns(table))
      .filter(
        ([, column]) =>
          timestamps.has(column.columnType) &&
          (column as { withTimezone?: boolean }).withTimezone !== true,
      )
      .map(([key]) => `${getTableName(table)}.${key}`),
  );
}

/** Stored values are English identifiers: no accent, no space, no hyphen. */
function looseEnumValues(values: readonly (readonly string[])[]): string[] {
  return values.flat().filter((value) => !snakeCase.test(value));
}

const enumValues = Object.values(schema).flatMap((entry) =>
  isPgEnum(entry) ? [entry.enumValues] : [],
);

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

  it("keeps money in integer cents", () => {
    expect(inexactMoney(tables)).toEqual([]);
  });

  it("stores every instant with its time zone", () => {
    expect(zonelessInstants(tables)).toEqual([]);
  });

  it("stores enum values as snake_case English identifiers", () => {
    expect(enumValues.length).toBeGreaterThan(0);
    expect(looseEnumValues(enumValues)).toEqual([]);
  });

  it("recognizes the mistakes these rules exist for", () => {
    const bad = pgTable("bad", {
      price: real(),
      totalAmount: doublePrecision(),
      fee: numeric(),
      note: real(),
      seenAt: timestamp(),
      sentAt: timestamp({ withTimezone: true }),
      label: text(),
    });
    expect(inexactMoney([bad])).toEqual(["bad.price", "bad.totalAmount", "bad.fee"]);
    expect(zonelessInstants([bad])).toEqual(["bad.seenAt"]);
    expect(looseEnumValues([["paid", "yearly-once", "não_pago", "Paid"]])).toEqual([
      "yearly-once",
      "não_pago",
      "Paid",
    ]);
  });
});
