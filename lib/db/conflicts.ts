import { type Column, type SQL, sql } from "drizzle-orm";
import { DomainError, type ErrorKey } from "@/lib/errors";

/*
 * The two refusals every record with a form needs. A value that must be unique in the database
 * (a CPF in an account, a code) comes back as a 409 with the sentence that names it, instead of a
 * 500. A change made over the version the form was opened with is written only if nobody changed
 * the record since; otherwise nothing is written and the caller answers 409.
 */

const UNIQUE_VIOLATION = "23505";

/** Postgres refused a duplicate. The driver's error arrives wrapped, so the whole cause chain is read. */
function isUniqueViolation(error: unknown): boolean {
  for (let cause: unknown = error; cause instanceof Error; cause = cause.cause) {
    if ((cause as { code?: unknown }).code === UNIQUE_VIOLATION) {
      return true;
    }
  }
  return false;
}

/** Runs a write and turns a duplicate into a 409 with `key`; anything else passes through. */
export function refusingDuplicates<T>(key: ErrorKey, write: () => Promise<T>): Promise<T> {
  return write().catch((error: unknown) => {
    throw isUniqueViolation(error) ? new DomainError(409, key, { cause: error }) : error;
  });
}

/**
 * True in a `where` only while the record is still the version the form saw. The database keeps
 * microseconds and a Date carries milliseconds, so both are compared at the millisecond.
 */
export const sameVersion = (updatedAt: Column, seen: Date): SQL =>
  sql`date_trunc('milliseconds', ${updatedAt}) = ${seen.toISOString()}::timestamptz`;
