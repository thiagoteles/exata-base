/*
 * Public pages that come from the database register here, one source per area, each returning
 * its route addresses and when each last changed. The sitemap joins them with the fixed pages
 * of `publicRoutes` and writes every address in its public form. A source reads with
 * `'use cache'` and a tag from `lib/cache-tags.ts`, so a busy sitemap never loads the database.
 */

export type SitemapEntry = { path: `/${string}`; lastModified?: Date };

export type SitemapSource = { name: string; entries: () => Promise<readonly SitemapEntry[]> };

/** Every source of database pages. A product adds one per public area (results, articles). */
export const sitemapSources: readonly SitemapSource[] = [];
