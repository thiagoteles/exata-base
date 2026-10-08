/*
 * Every page a search engine may list. The sitemap reads this list, so a new public page is added
 * here and nowhere else. Signed-in areas never belong here.
 */
export const publicRoutes = ["/", "/contact", "/privacy", "/terms"] as const;
