import site from "@/messages/pt-BR/site.json";

/**
 * The product name and tagline, for the places that run outside a request (icons, share image).
 * Read from its own area of the catalog: the root's icons import it, so the whole catalog would be
 * compiled into every page.
 */
export const siteName = site.name;
export const siteDescription = site.description;
