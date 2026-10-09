import type { MetadataRoute } from "next";
import { publicPathOf } from "./i18n/public-paths";
import { publicRoutes } from "./public-routes";
import { protectedPrefixes } from "./routes";
import type { SitemapEntry } from "./sitemap-sources";

/** The sitemap: one absolute URL per public page, fixed pages first, then each source's. */
export function sitemapFor(
  appUrl: string,
  fromSources: readonly SitemapEntry[] = [],
): MetadataRoute.Sitemap {
  const entries: readonly SitemapEntry[] = [
    ...publicRoutes.map((path) => ({ path })),
    ...fromSources,
  ];
  return entries.map(({ path, lastModified }) => ({
    url: new URL(publicPathOf(path) ?? path, appUrl).toString(),
    ...(lastModified === undefined ? {} : { lastModified }),
  }));
}

const privateAreas = [...protectedPrefixes, "/api/", "/storage/", "/health"];

/**
 * Only production is indexed. Everywhere else the whole site is closed to crawlers, so a staging
 * copy never competes with the real one.
 */
export function robotsFor(appUrl: string, isProduction: boolean): MetadataRoute.Robots {
  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: privateAreas },
    sitemap: new URL("/sitemap.xml", appUrl).toString(),
  };
}
