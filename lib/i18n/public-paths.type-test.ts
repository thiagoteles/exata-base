import type { Route } from "next";
import { publicHref } from "./public-paths";

// Compiled by the typecheck only: each expected error proves the helper refuses a wrong call.
export const accepted: Route[] = [publicHref("/plans"), publicHref("/terms")];

// @ts-expect-error typedRoutes knows only folders (and redirects), so an address written by hand is
// refused; this one is no product's redirect either.
export const written: Route<"/endereco-escrito-a-mao"> = "/endereco-escrito-a-mao";
// @ts-expect-error a route that is not in the map
publicHref("/account");
// @ts-expect-error a static route given params
publicHref("/plans", { slug: "a" });
