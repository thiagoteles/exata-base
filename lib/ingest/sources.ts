import { jobRunSource } from "./job-run";
import type { IngestSource } from "./source";

/**
 * Every source a worker outside the server may deliver to, by name. A new one is a new entry here
 * and a `name=secret` pair in `INGEST_SECRETS`. Without its secret a source answers 401, like one
 * that does not exist.
 */
export const ingestSources: Readonly<Record<string, IngestSource>> = {
  "job-run": jobRunSource,
};
