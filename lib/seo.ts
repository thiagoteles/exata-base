import type { MetadataRoute } from "next";
import { defaultLocale, locales } from "./i18n/locales";
import { addressInLocale } from "./i18n/public-paths";
import { publicRoutes } from "./public-routes";
import { protectedPrefixes } from "./routes";
import type { SitemapEntry } from "./sitemap-sources";

/**
 * The sitemap: one absolute URL per public page, fixed pages first, then each source's. With more
 * than one language every page is listed in each, and each entry names its other-language forms.
 */
export function sitemapFor(
  appUrl: string,
  fromSources: readonly SitemapEntry[] = [],
  languages: readonly string[] = locales,
): MetadataRoute.Sitemap {
  const entries: readonly SitemapEntry[] = [
    ...publicRoutes.map((path) => ({ path })),
    ...fromSources,
  ];
  const absolute = (path: string, language: string) =>
    new URL(addressInLocale(path, language), appUrl).toString();
  return entries.flatMap(({ path, lastModified }) =>
    (languages.length > 1 ? languages : [defaultLocale]).map((language) => ({
      url: absolute(path, language),
      ...(lastModified === undefined ? {} : { lastModified }),
      ...(languages.length > 1
        ? {
            alternates: {
              languages: Object.fromEntries(languages.map((each) => [each, absolute(path, each)])),
            },
          }
        : {}),
    })),
  );
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
