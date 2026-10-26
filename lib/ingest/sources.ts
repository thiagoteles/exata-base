import { jobRunSource } from "./job-run";
import type { IngestSource } from "./source";
import { productIngestSources } from "./sources.product";

type Sources = Readonly<Record<string, IngestSource>>;

/** The base's sources and the product's under one set of names. A name both declare is refused. */
export function joinSources(base: Sources, product: Sources): Sources {
  const repeated = Object.keys(product).filter((name) => Object.hasOwn(base, name));
  if (repeated.length > 0) {
    throw new Error(`ingest sources declared twice: ${repeated.join(", ")}`);
  }
  return { ...base, ...product };
}

/**
 * Every source a worker outside the server may deliver to, by name: the base's here, the product's
 * in its own file. A new one is a new entry and a `name=secret` pair in `INGEST_SECRETS`. Without
 * its secret a source answers 401, like one that does not exist.
 */
export const ingestSources: Sources = joinSources(
  { "job-run": jobRunSource },
  productIngestSources,
);
