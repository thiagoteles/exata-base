import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { sampleItemStatuses } from "@/lib/sample-items/options";
import { calendarDate, createdAt, id, updatedAt } from "../columns";
import { ownedBy } from "./user-references";

export const sampleItemStatus = pgEnum("sample_items_status", sampleItemStatuses);

/* A record an account keeps. It belongs to the account that wrote it and goes with it. */
export const sampleItems = pgTable(
  "sample_items",
  {
    id: id(),
    ownerId: ownedBy().notNull(),
    name: text().notNull(),
    /* Unique within the account, when given. */
    code: text(),
    status: sampleItemStatus().notNull().default("open"),
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
    unique("sample_items_owner_id").on(table.ownerId, table.id),
    check("sample_items_code_shape", sql`${table.code} ~ '^[A-Z0-9-]{1,20}$'`),
  ],
);
