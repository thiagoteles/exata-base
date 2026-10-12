import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
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
    check("sample_items_code_shape", sql`${table.code} ~ '^[A-Z0-9-]{1,20}$'`),
  ],
);
