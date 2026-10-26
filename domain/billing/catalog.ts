/*
 * The plans the product sells come from the product's own catalog file; this module gives them to
 * the rest of the app with what is worked out from them.
 */

import { catalog as productCatalog } from "./catalog.product";
import type { CatalogShape } from "./catalog-shape";

export const catalog = productCatalog;

const pricesOf = (source: CatalogShape) => source.prices as Readonly<Record<string, string>>;

/** The lookup key a tier is sold under for an interval, or undefined when it is not sold that way. */
export function lookupKeyOf(
  tier: string,
  interval: string,
  source: CatalogShape = catalog,
): string | undefined {
  return pricesOf(source)[`${tier}.${interval}`];
}

/** The tiers on sale, those with at least one price, in the order the catalog lists them. */
export function soldTiers(source: CatalogShape = catalog): string[] {
  const priced = new Set(Object.keys(pricesOf(source)).map((key) => key.split(".")[0]));
  return Object.keys(source.tiers).filter((tier) => priced.has(tier));
}

/** Which tier and interval a provider's lookup key sells, or null for a key the catalog does not name. */
export function priceKeyOfLookup(
  source: CatalogShape,
  lookupKey: string,
): { tier: string; interval: string } | null {
  const entry = Object.entries(pricesOf(source)).find(([, key]) => key === lookupKey);
  if (entry === undefined) {
    return null;
  }
  const [tier = "", interval = ""] = entry[0].split(".");
  return { tier, interval };
}
