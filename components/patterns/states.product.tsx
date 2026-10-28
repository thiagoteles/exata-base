import type { ComponentType } from "react";
import type { NoResultsViewProps } from "./list-controls";
import type { ListEmptyProps, SectionEmptyProps } from "./list-states";

/*
 * The product's own empty states, in place of the base's, everywhere one is drawn: a list with
 * nothing yet, and an empty part of a page. Each receives what the base's receives (the words, the
 * steps, the example rows, an icon when the screen gives one). The product owns this file; the base
 * ships it empty and draws its own. The list's no-results state is drawn in the browser, so the
 * component given for it must be a client component.
 */

export const productListEmpty: ComponentType<ListEmptyProps> | null = null;

export const productSectionEmpty: ComponentType<SectionEmptyProps> | null = null;

/** A search or filter that found nothing: the words and the clearing are the base's, the look is the product's. */
export const productNoResults: ComponentType<NoResultsViewProps> | null = null;
