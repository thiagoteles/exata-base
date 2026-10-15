/*
 * The plans the product sells come from the product's own catalog file; this module gives them to
 * the rest of the app with what is worked out from them.
 */

import { catalog as productCatalog } from "./catalog.product";

export const catalog = productCatalog;

/** The lookup key a tier is sold under for an interval, or undefined when it is not sold that way. */
export function lookupKeyOf(tier: string, interval: string): string | undefined {
  return (catalog.prices as Readonly<Record<string, string>>)[`${tier}.${interval}`];
}
