import { productPublicRoutes } from "./public-routes.product";

/*
 * Every fixed page a search engine may list: the base's, and the product's from its own file. The
 * sitemap reads this list. Signed-in areas never belong here.
 */
export const publicRoutes = [
  "/",
  "/articles",
  "/contact",
  "/privacy",
  "/terms",
  ...productPublicRoutes,
] as const;
