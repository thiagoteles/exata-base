import type { Article, Organization, WebSite, WithContext } from "schema-dts";
import type { Frontmatter } from "./content/frontmatter";

/*
 * Typed builders for schema.org data, so a page describes itself to search engines in the shape
 * they read. The product adds builders for its own kinds (an article, an FAQ, a result) next to
 * these, each with absolute addresses built from the runtime APP_URL.
 */

export function organizationData(
  appUrl: string,
  name: string,
  description: string,
): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    description,
    url: new URL("/", appUrl).toString(),
    logo: new URL("/icon", appUrl).toString(),
  };
}

export function websiteData(appUrl: string, name: string): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: new URL("/", appUrl).toString(),
    inLanguage: "pt-BR",
  };
}

export function structuredArticle(url: string, article: Frontmatter): WithContext<Article> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: { "@type": "Organization", name: article.author },
    mainEntityOfPage: url,
  };
}
