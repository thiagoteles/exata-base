import type { Route } from "next";
import { publicHref } from "./public-paths";

// Compiled by the typecheck only: each expected error proves the helper refuses a wrong call.
export const accepted: Route[] = [publicHref("/plans"), publicHref("/terms")];

// @ts-expect-error typedRoutes knows only folders, so a public address written by hand is refused
export const written: Route<"/planos"> = "/planos";
// @ts-expect-error a route that is not in the map
publicHref("/account");
// @ts-expect-error a static route given params
publicHref("/plans", { slug: "a" });
