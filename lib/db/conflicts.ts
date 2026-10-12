import { type Column, type SQL, sql } from "drizzle-orm";
import { DomainError, type ErrorKey } from "@/lib/errors";

/*
 * The refusals every record with a form needs. A value that must be unique in the database
 * (a CPF in an account, a code) comes back as a 409 with the sentence that names it, instead of a
 * 500. A row that points at one that is not there, or one deleted while others still point at it,
 * comes back the same way. A change made over the version the form was opened with is written only if nobody changed
 * the record since; otherwise nothing is written and the caller answers 409.
 */

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

/** Postgres refused with `code`. The driver's error arrives wrapped, so the whole cause chain is read. */
function isViolation(error: unknown, code: string): boolean {
  for (let cause: unknown = error; cause instanceof Error; cause = cause.cause) {
    if ((cause as { code?: unknown }).code === code) {
      return true;
    }
  }
  return false;
}

const refusing =
  (code: string) =>
  <T>(key: ErrorKey, write: () => Promise<T>): Promise<T> =>
    write().catch((error: unknown) => {
      throw isViolation(error, code) ? new DomainError(409, key, { cause: error }) : error;
    });

/** Runs a write and turns a duplicate into a 409 with `key`; anything else passes through. */
export const refusingDuplicates = refusing(UNIQUE_VIOLATION);

/**
 * Runs a write and turns a broken link into a 409 with `key`: a child filed under a parent that
 * is not there (or not the account's), or a parent deleted while children still point at it.
 */
export const refusingBrokenLinks = refusing(FOREIGN_KEY_VIOLATION);

/**
 * True in a `where` only while the record is still the version the form saw. The database keeps
 * microseconds and a Date carries milliseconds, so both are compared at the millisecond.
 */
export const sameVersion = (updatedAt: Column, seen: Date): SQL =>
  sql`date_trunc('milliseconds', ${updatedAt}) = ${seen.toISOString()}::timestamptz`;
