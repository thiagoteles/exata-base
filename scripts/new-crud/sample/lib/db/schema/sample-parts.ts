import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { samplePartStatuses } from "@/lib/sample-parts/options";
import { calendarDate, createdAt, id, updatedAt } from "../columns";
import { sampleItems } from "./sample-items";
import { ownedBy } from "./user-references";

export const samplePartStatus = pgEnum("sample_parts_status", samplePartStatuses);

/*
 * A record an account keeps under one of its sample items. It belongs to the account that wrote it
 * and goes with it.
 */
export const sampleParts = pgTable(
  "sample_parts",
  {
    id: id(),
    ownerId: ownedBy().notNull(),
    sampleItemId: uuid().notNull(),
    name: text().notNull(),
    /* Unique within the account, when given. */
    code: text(),
    status: samplePartStatus().notNull().default("open"),
    dueDate: calendarDate(),
    notes: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index().on(table.ownerId, table.name),
    index().on(table.ownerId, table.createdAt),
    uniqueIndex().on(table.ownerId, table.code).where(sql`${table.code} is not null`),
    // A child area points at (owner, id), so the database refuses a child filed under another
    // account's record. It is here from the first migration: drizzle-kit writes a new foreign key
    // before a new unique in the same migration, and Postgres refuses that order.
    unique("sample_parts_owner_id").on(table.ownerId, table.id),
    index().on(table.sampleItemId),
    // The owner is repeated in the key, so the database refuses a record filed under another
    // account's sample item. No action on delete: the sample item stays while records point at it,
    // and deleting the account still takes both, since the check runs at the end of the cascade.
    foreignKey({
      columns: [table.ownerId, table.sampleItemId],
      foreignColumns: [sampleItems.ownerId, sampleItems.id],
      name: "sample_parts_parent_fk",
    }),
    check("sample_parts_code_shape", sql`${table.code} ~ '^[A-Z0-9-]{1,20}$'`),
  ],
);
