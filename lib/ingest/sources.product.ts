import type { IngestSource } from "./source";

/*
 * The product's own sources, delivered to beside the base's under their names. The product owns this
 * file. Each name also needs its `name=secret` pair in `INGEST_SECRETS`, and may not repeat a name of
 * the base's.
 */
export const productIngestSources: Readonly<Record<string, IngestSource>> = {};
