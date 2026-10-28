import type { MDXComponents } from "mdx/types";
import type { ComponentType } from "react";
import type { ArticlePageProps } from "@/components/patterns/article-page";

/*
 * The product's own drawing of an article: the page around it and the look of its Markdown
 * elements. The product owns this file; the base ships it empty and draws its own.
 */

/** The article's page, given its words, its trail and its body already rendered. */
export const productArticlePage: ComponentType<ArticlePageProps> | null = null;

/** Markdown elements the product draws its own way, laid over the base's. */
export const productMdxComponents: MDXComponents = {};
