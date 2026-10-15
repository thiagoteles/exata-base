import type { z } from "zod";

/*
 * The product's own environment variables, each with its schema and local default, joined to the
 * base's. Only the base's environment module reads them; this file only describes them. The product
 * owns this file.
 */
export const productEnv = {} as const satisfies Record<string, z.ZodType>;
