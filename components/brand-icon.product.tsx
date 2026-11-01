import type { ReactElement } from "react";

/*
 * The product's own icon, for the browser tab and a phone's home screen. The product owns this
 * file; the base ships it empty and draws the first letter of the product's name.
 */

/**
 * Draws the mark at the size asked, as an image response draws it: inline styles, plain SVG and
 * sRGB colors (the e-mail palette), with the corner the place wants (none on a home screen, which
 * rounds it itself).
 */
export const productIcon: ((icon: { size: number; corner: number }) => ReactElement) | null = null;
