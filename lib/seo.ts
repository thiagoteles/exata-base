import type { MetadataRoute } from "next";
import { publicRoutes } from "./public-routes";
import { protectedPrefixes } from "./routes";

/** The sitemap: one absolute URL per public page. */
export function sitemapFor(appUrl: string): MetadataRoute.Sitemap {
  return publicRoutes.map((path) => ({ url: new URL(path, appUrl).toString() }));
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
