import type { CspSources } from "./csp";

/*
 * The origins the product's own pages load from (a map, a video, a font), each declared as the
 * part of the policy it needs. The product owns this file.
 */
export function productCspSources(): CspSources[] {
  return [];
}
