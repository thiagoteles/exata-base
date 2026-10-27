import type { ComponentType } from "react";
import type { PublicFooterProps } from "./public-footer";
import type { PublicHeaderProps } from "./public-header";

/*
 * The product's own header and footer for the public pages, in place of the base's. Each receives
 * what the base's receives: the session's actions, the theme and language choices, whether plans
 * are on sale. The product owns this file; the base ships it empty and draws its own.
 */

export const productPublicHeader: ComponentType<PublicHeaderProps> | null = null;

export const productPublicFooter: ComponentType<PublicFooterProps> | null = null;
