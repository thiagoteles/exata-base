import type { Route } from "next";

/*
 * The product's own pages in the public footer, shown before the base's links. Each names its text
 * at `nav.footerLinks.<key>` in the catalog and its address with `publicHref`, so it follows the
 * page's public address. The product owns this file; the base ships it empty.
 */

type FooterLink = { key: string; href: Route };

export const productFooterLinks: readonly FooterLink[] = [];
