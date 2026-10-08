import { type Column, sql } from "drizzle-orm";

const escapeLike = /[\\%_]/g;

/** A search term as a LIKE pattern in which `%` and `_` are plain characters. */
const likeTerm = (text: string) => `%${text.replace(escapeLike, "\\$&")}%`;

/**
 * Whether a column contains the term, ignoring case and accents: "jose" finds "José". It needs the
 * `unaccent` extension, which a migration creates.
 */
export const contains = (column: Column, term: string) =>
  sql`unaccent(${column}) ilike unaccent(${likeTerm(term)})`;
