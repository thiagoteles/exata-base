import type { ReactNode } from "react";
import type { productDocumentKinds } from "@/lib/documents/kinds.product";

/*
 * What the verification page shows for each of the product's kinds of document: a server component
 * that reads the record by its id, as it is now, and calls notFound() when it is gone. A kind left
 * out has no verification page. The product owns this file.
 */
export const productVerifications: {
  readonly [K in (typeof productDocumentKinds)[number]]?: (props: {
    id: string;
  }) => Promise<ReactNode>;
} = {};
