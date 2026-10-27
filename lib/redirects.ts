import { productMovedAddresses } from "./redirects.product";

/*
 * Addresses that moved for good. Each one answers 301 to its new place, so search engines carry the
 * old address's standing over. A destination never points at another source: a chain costs a round
 * trip per hop and loses standing, and a test refuses it. Public addresses are written as the
 * visitor sees them. The product adds its own in `lib/redirects.product.ts`.
 */

export type Redirect = { source: `/${string}`; destination: `/${string}` };

const baseMovedAddresses: readonly Redirect[] = [];

export const movedAddresses: readonly Redirect[] = [
  ...baseMovedAddresses,
  ...productMovedAddresses,
];
