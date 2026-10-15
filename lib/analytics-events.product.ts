/*
 * The product's own analytics events, with the properties each one carries, beside the base's
 * funnel. A property may never be named after personal data: the catalog refuses it. The product
 * owns this file.
 */
// biome-ignore lint/complexity/noBannedTypes: the base ships no event of the product's; a product's file lists its own
export type ProductEvents = {};

/** A funnel of the product's own events, saved in the analytics service beside the standard ones. */
export type ProductFunnel = {
  name: string;
  description: string;
  /** The events in order, from the product's catalog or the base's. */
  steps: readonly string[];
  /** How long a person has, from the first step to the last. */
  windowMinutes: number;
};

/** The product's funnels; `pnpm umami setup` creates and corrects them like the standard reports. */
export const productFunnels: readonly ProductFunnel[] = [];
