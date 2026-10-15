/*
 * The product's own public routes with a dynamic segment, and how to tell whether an address names
 * a page that exists, reading a list that needs no database call. The product owns this file.
 */
export const productDynamicRoutes: readonly {
  route: string;
  exists: (params: Record<string, string>) => boolean;
}[] = [];
