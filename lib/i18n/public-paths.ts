import type { Route } from "next";
import { defaultLocale } from "./locales";
import { pathInLocale } from "./negotiate";
import { createPathMap, fillPath } from "./path-map";

/*
 * The addresses a visitor sees, by the route that serves them. Folders under `app/` stay in
 * English; the proxy serves each public address from its route and answers the English address
 * with a permanent redirect to the public one, so search engines index one address. The signed-in
 * area and the sign-in screens keep their route addresses. A product adds its public pages here,
 * dynamic ones included (`"/lotteries/[game]": "/loterias/[game]"`).
 */
export const publicPaths = {
  "/plans": "/planos",
  "/contact": "/contato",
  "/privacy": "/privacidade",
  "/terms": "/termos",
  "/unsubscribe": "/descadastrar",
  "/articles": "/artigos",
  "/articles/[slug]": "/artigos/[slug]",
  "/verify/[slug]": "/verificar/[slug]",
} as const;

type MappedRoute = keyof typeof publicPaths;

// PageProps only accepts a page route, so a key that is not a page fails the typecheck here.
type ParamsOf<R extends MappedRoute> = Awaited<PageProps<R>["params"]>;
type ParamArgs<R extends MappedRoute> = keyof ParamsOf<R> extends never ? [] : [ParamsOf<R>];

const pathMap = createPathMap(publicPaths);
export const { publicPathOf } = pathMap;
const { internalPathOf } = pathMap;

/**
 * The address a link to a mapped route points to: the public one. The route and its params are
 * typed against the app's pages. A link written with the route address still works, but its
 * prefetch hits the redirect and each click costs a round trip.
 */
export function publicHref<R extends MappedRoute>(route: R, ...[params]: ParamArgs<R>): Route {
  return fillPath(publicPaths[route], (params ?? {}) as Record<string, string>, true) as Route;
}

/**
 * The address of a route address in a language. The default language has the Portuguese addresses
 * of the map and no prefix; every other language keeps the route's own English address under its
 * prefix (`/en/plans`), since the Portuguese words belong to the default language only.
 */
export function addressInLocale(route: string, locale: string): string {
  return locale === defaultLocale ? (publicPathOf(route) ?? route) : pathInLocale(route, locale);
}

export type ServedAddress = {
  /** The route that answers, which is what the app's folders are written for. */
  route: string;
  /** Where to send a page load first, when the address is another language's form of this page. */
  redirectTo: string | null;
};

/**
 * What a request address means in a language, without its prefix. In the default language the route
 * address moves to its Portuguese one. In another, the Portuguese address moves to the route
 * address, so each page has one address per language and a search engine indexes only that one.
 */
export function servedAddress(pathname: string, isDefaultLanguage: boolean): ServedAddress {
  if (isDefaultLanguage) {
    return { route: internalPathOf(pathname) ?? pathname, redirectTo: publicPathOf(pathname) };
  }
  const route = internalPathOf(pathname);
  return route === null ? { route: pathname, redirectTo: null } : { route, redirectTo: route };
}
