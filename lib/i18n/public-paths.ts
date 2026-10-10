import type { Route } from "next";
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

export const { publicPathOf, internalPathOf } = createPathMap(publicPaths);

/**
 * The address a link to a mapped route points to: the public one. The route and its params are
 * typed against the app's pages. A link written with the route address still works, but its
 * prefetch hits the redirect and each click costs a round trip.
 */
export function publicHref<R extends MappedRoute>(route: R, ...[params]: ParamArgs<R>): Route {
  return fillPath(publicPaths[route], (params ?? {}) as Record<string, string>, true) as Route;
}
