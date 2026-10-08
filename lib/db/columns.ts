import { timestamp, uuid } from "drizzle-orm/pg-core";

/*
 * The columns every domain table starts with. Property names are camelCase; the database casing
 * turns them into snake_case columns, so no column is named by hand.
 */

export const id = () => uuid().primaryKey().defaultRandom();

export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const instant = () => timestamp({ withTimezone: true });
