import type { SitemapSource } from "@/lib/sitemap-sources";
import { articles } from "./articles-index";

/*
 * The articles as the app reads them: from the generated index, never from the content folder, so
 * a production server needs no file but the bundled modules.
 */

export const articleSlugs: ReadonlySet<string> = new Set(articles.map((article) => article.slug));

export const findArticle = (slug: string) => articles.find((article) => article.slug === slug);

export const articleSitemap: SitemapSource = {
  name: "articles",
  entries: () =>
    Promise.resolve(
      articles.map((article) => ({
        path: `/articles/${article.slug}` as const,
        lastModified: new Date(`${article.updatedAt ?? article.publishedAt}T12:00:00Z`),
      })),
    ),
};
