/*
 * The product's own public routes with a dynamic segment, and how to tell whether an address names
 * a page that exists. The check may read the database; keeping it cheap is the product's job, since
 * it runs on every visit to that route's addresses. The product owns this file.
 */
export const productDynamicRoutes: readonly {
  route: string;
  exists: (params: Record<string, string>) => boolean | Promise<boolean>;
}[] = [];
