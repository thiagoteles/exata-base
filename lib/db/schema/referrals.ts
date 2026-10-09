import { index, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../columns";
import { authoredBy, ownedBy } from "./user-references";

/*
 * Who invited whom. The row is about the person who arrived, so it goes with their account; the
 * inviter is only named in it, so if their account goes the row stays (it may be what a reward is
 * owed for) with the e-mail they had. One row per arrival: a person is invited once.
 */
export const referrals = pgTable(
  "referrals",
  {
    id: id(),
    referredId: ownedBy().notNull().unique(),
    referrerId: authoredBy(),
    referrerEmail: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index().on(table.referrerId)],
);
