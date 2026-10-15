import { sampleItemStatus, sampleItems } from "./schema/sample-items";
import { samplePartStatus, sampleParts } from "./schema/sample-parts";

/*
 * The product's own tables and enums, joined to the base's in the schema. The product owns this
 * file: the base ships it with its samples, and merges from the base never take it back.
 */
export const productSchema = {
  sampleParts,
  samplePartStatus,
  sampleItems,
  sampleItemStatus,
};
