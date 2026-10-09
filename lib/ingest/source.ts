import type { Database } from "@/lib/db/database";
import { DomainError } from "@/lib/errors";
import type { z } from "@/lib/validation";

/**
 * A source of data a worker outside the server may deliver. It declares the shape of the payload
 * (zod) and what the server does with a valid one, and returns plain counts. A delivery may arrive
 * twice, so applying it must be idempotent.
 */
export type IngestSource = {
  accept: (input: { db: Database; body: unknown; now: Date }) => Promise<Record<string, number>>;
};

export function ingestSource<T>(
  schema: z.ZodType<T>,
  apply: (input: { db: Database; payload: T; now: Date }) => Promise<Record<string, number>>,
): IngestSource {
  return {
    accept: async ({ db, body, now }) => {
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        throw new DomainError(400);
      }
      return await apply({ db, payload: parsed.data, now });
    },
  };
}
