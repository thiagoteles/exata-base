---
name: new-ingest-source
description: Let a worker outside the server deliver data to the product, such as a collector, a scraper or a script on another machine. Use instead of giving that worker database access or writing a new route.
---

# New ingest source

A worker outside the server (a collector that runs on another machine, a script on a schedule) only
fetches and delivers. The rules stay on the server: it validates what arrives and decides what to
do with it. The reference is `lib/ingest/job-run.ts`, the one source the base ships: a worker
reports that a run of its job ended, and the server records it for the health panel and the absence
alarm. The address is `POST /api/ingest/<source>`.

1. **Declare the source** with `ingestSource(schema, apply)` from `lib/ingest/source.ts`: a strict
   zod schema for the payload (`.strict()`, bounded numbers and lengths) and an `apply` that returns
   plain counts. A bad payload is refused with 400 before `apply` runs.
2. **Make `apply` idempotent.** A worker retries, so a delivery can arrive twice. Key what it writes
   by something in the payload (an id, a day) and use an upsert or `onConflictDoNothing`, the way
   the payment record does.
3. **Register it** in `lib/ingest/sources.ts` under a name of lower-case letters, digits and hyphens.
4. **Give it a secret.** Add `name=secret` to `INGEST_SECRETS` (a pair per source, comma-separated,
   at least 32 characters each, one secret per source so a leak exposes one source). Without its
   secret a source answers 401, exactly like one that does not exist. Generate the secret with
   `openssl rand -hex 32`; it never goes in the repository.
5. **Test it** against a real database like `tests/integration/ingest.test.ts`: a valid payload, the
   same payload twice, and the payloads the schema must refuse. The order of checks (secret, then
   the source's rate limit, then the body) is already tested in `lib/ingest/handle.test.ts`.
6. **Tell the worker's owner** the address, the header (`Authorization: Bearer <secret>`), the JSON
   shape and that a 429 means to wait. A job the worker runs on a schedule should also deliver a
   `job-run` after each run, with a line for it in `ops/gcp/heartbeats.json`.
