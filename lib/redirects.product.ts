import type { Redirect } from "./redirects";

/*
 * The product's own moved addresses, joined to the base's: the old site's addresses a product
 * replaces, each answering 301 to its new place. A source may hold `:name` segments, carried into
 * the destination as Next does. The product owns this file.
 */
export const productMovedAddresses: readonly Redirect[] = [];
