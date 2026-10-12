import { articleSlugs } from "./content/articles";
import { readDocument } from "./documents/slug";
import { env } from "./env";
import { matchPath } from "./i18n/path-map";

/*
 * Public routes with a dynamic segment, and how to tell whether an address names a page that
 * exists. Under Cache Components the shell of a dynamic page streams before the page can call
 * notFound(), so a missing page would answer 200; the proxy asks here first and answers a real 404.
 * A product adds one entry per public dynamic route, reading a list that needs no database call.
 */
const dynamicRoutes: readonly {
  route: string;
  exists: (params: Record<string, string>) => boolean;
}[] = [
  { route: "/articles/[slug]", exists: ({ slug = "" }) => articleSlugs.has(slug) },
  // An address nobody signed is no page; whether the record behind a signed one still exists is the page's to say.
  {
    route: "/verify/[slug]",
    exists: ({ slug = "" }) => readDocument(env.DOCUMENT_SECRET, slug) !== null,
  },
];

/** True when the route address fits a dynamic public route but names no page. */
export function isMissingPage(pathname: string): boolean {
  return dynamicRoutes.some(({ route, exists }) => {
    const params = matchPath(route, pathname);
    return params !== null && !exists(params);
  });
}
