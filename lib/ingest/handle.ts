import type { Database } from "@/lib/db/database";
import { DomainError } from "@/lib/errors";
import { isAuthorizedCall } from "@/lib/scheduled/authorize";
import type { IngestSecrets } from "./secrets";
import type { IngestSource } from "./source";

/*
 * What a worker outside the server may do: deliver a payload to a source the server declared. The
 * rules stay on the server (the source validates and applies the payload); the worker only fetches
 * and delivers. The order is the point: the secret is checked before anything is read, so an
 * unknown source, a wrong secret and a missing one look the same, and a caller without the secret
 * costs the server no body, no parsing and no rate limit slot.
 */

const MAX_BODY_BYTES = 1_048_576;

export type IngestCall = {
  source: string;
  authorization: string | null;
  contentLength: number | null;
  readBody: () => Promise<string>;
};

export type IngestDeps = {
  db: Database;
  sources: Readonly<Record<string, IngestSource>>;
  secrets: IngestSecrets;
  now: Date;
  /** Counts the call against the source's limit and throws the 429 when it is over. */
  enforceLimit: (source: string) => Promise<void>;
};

const own = (record: Readonly<Record<string, unknown>>, key: string) =>
  Object.hasOwn(record, key) ? record[key] : undefined;

function parseJson(text: string): { valid: true; value: unknown } | { valid: false } {
  try {
    return { valid: true, value: JSON.parse(text) as unknown };
  } catch {
    return { valid: false };
  }
}

export async function handleIngest(
  deps: IngestDeps,
  call: IngestCall,
): Promise<Record<string, number>> {
  const source = own(deps.sources, call.source) as IngestSource | undefined;
  const secret = own(deps.secrets, call.source) as string | undefined;
  if (source === undefined || !isAuthorizedCall(secret, call.authorization)) {
    throw new DomainError(401);
  }
  await deps.enforceLimit(call.source);
  if (call.contentLength !== null && call.contentLength > MAX_BODY_BYTES) {
    throw new DomainError(400);
  }
  const text = await call.readBody();
  if (text.length > MAX_BODY_BYTES) {
    throw new DomainError(400);
  }
  const body = parseJson(text);
  if (!body.valid) {
    throw new DomainError(400);
  }
  return await source.accept({ db: deps.db, body: body.value, now: deps.now });
}
