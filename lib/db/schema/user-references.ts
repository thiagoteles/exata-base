import { uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/*
 * Every foreign key to users.id goes through one of these two, which is how a table declares what
 * happens when an account is deleted.
 *
 * ownedBy: the row exists because of the person and is deleted with them.
 * authoredBy: the row is a fact about someone else or about the team, and stays. The id becomes
 * null, so the table keeps a copy of the author's e-mail in a sibling column named after it
 * (`actorId` and `actorEmail`, `invitedBy` and `invitedByEmail`).
 */

export const ownedBy = () => uuid().references(() => users.id, { onDelete: "cascade" });

export const authoredBy = () => uuid().references(() => users.id, { onDelete: "set null" });
