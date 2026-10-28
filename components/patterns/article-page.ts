import type { Route } from "next";
import type { ReactNode } from "react";

/** An article as a product receives it to draw: its words, the trail to it, and the body already rendered. */
export type ArticlePageProps = {
  title: string;
  description: string;
  /** "Por Equipe ...", the publication date and the update date when there is one, in the reader's words. */
  meta: readonly string[];
  trail: { label: string; items: readonly { label: string; href?: Route }[] };
  slug: string;
  children: ReactNode;
};
