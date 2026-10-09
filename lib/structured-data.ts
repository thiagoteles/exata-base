import type {
  Article,
  BreadcrumbList,
  FAQPage,
  Organization,
  Product,
  WebSite,
  WithContext,
} from "schema-dts";
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

/** The questions a page answers, exactly as it shows them. */
export function faqData(
  items: readonly { question: string; answer: string }[],
): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

type Sale = { name: string; cents: number; currency: string };

/** What is on sale, one offer per way of paying. Prices are decimal strings in the currency's units. */
export function productData(
  appUrl: string,
  product: { name: string; description: string; path: string },
  sales: readonly Sale[],
): WithContext<Product> {
  const url = new URL(product.path, appUrl).toString();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    url,
    offers: sales.map((sale) => ({
      "@type": "Offer",
      name: sale.name,
      price: (sale.cents / 100).toFixed(2),
      priceCurrency: sale.currency.toUpperCase(),
      availability: "https://schema.org/InStock",
      url,
    })),
  };
}

/** The trail to a page, from the top down. The last step is the page itself and has no link. */
export function breadcrumbData(
  appUrl: string,
  trail: readonly { name: string; path?: string }[],
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      ...(step.path === undefined ? {} : { item: new URL(step.path, appUrl).toString() }),
    })),
  };
}
