import { uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/*
 * Every foreign key to users.id goes through one of these two, which is how a table declares what
 * happens when an account is deleted.
 *
 * ownedBy: the row exists because of the person and is deleted with them.
 * authoredBy: the row is a fact that must outlive the account, such as an official record or a
 * staff action. The id becomes null. Write the author's e-mail in the sibling column at the same
 * time as the row (`actorId` and `actorEmail`), so the fact still names someone afterwards.
 */

export const ownedBy = () => uuid().references(() => users.id, { onDelete: "cascade" });

export const authoredBy = () => uuid().references(() => users.id, { onDelete: "set null" });
