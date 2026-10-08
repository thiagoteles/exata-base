import { sql } from "drizzle-orm";
import { boolean, check, jsonb, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../columns";

export const userRole = pgEnum("user_role", ["member", "staff", "admin"]);

/** Preferences that must not become columns. Theme and locale are copied to cookies on sign-in. */
export type UserOptions = { theme?: "light" | "dark"; locale?: string };

/*
 * The application's user row, in both auth modes. In local mode it is also the better-auth user
 * table; in Clerk mode it is kept in sync by the webhook and keyed by clerkId.
 */
export const users = pgTable(
  "users",
  {
    id: id(),
    name: text().notNull().default(""),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: userRole().notNull().default("member"),
    options: jsonb().$type<UserOptions>().notNull().default({}),
    clerkId: text().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [check("users_email_lowercase", sql`${table.email} = lower(${table.email})`)],
);
