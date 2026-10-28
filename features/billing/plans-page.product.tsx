import type { ComponentType } from "react";

/*
 * The product's own public plans page, in place of the base's. The product owns this file; the base
 * ships it empty and draws its own.
 */

export type PlansPageProps = { searchParams: Promise<{ source?: string | string[] }> };

/** The page that sells the plans to a visitor, given the address's query. */
export const productPlansPage: ComponentType<PlansPageProps> | null = null;
