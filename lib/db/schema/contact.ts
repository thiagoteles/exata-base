import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, instant, updatedAt } from "../columns";
import { authoredBy, ownedBy } from "./user-references";

export const contactSubject = pgEnum("contact_subject", [
  "general",
  "support",
  "billing",
  "privacy",
]);
export const contactStatus = pgEnum("contact_status", [
  "new",
  "in_progress",
  "answered",
  "archived",
]);

/* A message sent from the public contact form. userId is set when the sender was signed in. */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: id(),
    userId: ownedBy(),
    name: text().notNull(),
    email: text().notNull(),
    subject: contactSubject().notNull(),
    body: text().notNull(),
    /* The language the sender was using, so the answer goes out in it. */
    locale: text().notNull().default("pt-BR"),
    status: contactStatus().notNull().default("new"),
    replyBody: text(),
    answeredAt: instant(),
    answeredBy: authoredBy(),
    answeredByEmail: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index().on(table.userId),
    index().on(table.answeredBy),
    index().on(table.status, table.createdAt),
    check(
      "contact_messages_answer_is_complete",
      sql`(${table.answeredAt} is null) = (${table.answeredByEmail} is null)`,
    ),
  ],
);
