import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RuntimeMarker } from "@/components/runtime-marker";
import { articles } from "@/lib/content/articles-index";
import { formatDate, type IsoDate } from "@/lib/date";
import { env } from "@/lib/env";
import { publicHref } from "@/lib/i18n/public-paths";
import { buildSocialMetadata } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("articles");
  const metadata = await buildSocialMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/articles",
  });
  // Readers find the feed from the list page.
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: { "application/rss+xml": new URL("/feed.xml", env.APP_URL).toString() },
    },
  };
}

/** Every article, newest first: the title is the link, the date sits on its own line in mono. */
export default async function ArticlesPage() {
  const t = await getTranslations("articles");
  return (
    <main className="mx-auto flex w-full max-w-170 flex-col gap-10 px-4 py-12 md:py-18">
      <RuntimeMarker />
      <header className="flex flex-col gap-3">
        <h1 className="text-page-title text-ink">{t("title")}</h1>
        <p className="text-body text-ink-muted">{t("subtitle")}</p>
      </header>
      {articles.length === 0 ? (
        <p className="text-body text-ink-muted">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col border-line border-t">
          {articles.map((article) => (
            <li key={article.slug} className="flex flex-col gap-2 border-line border-b py-6">
              <span className="font-mono text-data text-ink-muted tabular-nums">
                {formatDate(article.publishedAt as IsoDate)}
              </span>
              <h2 className="text-block-title text-ink">
                <Link
                  href={publicHref("/articles/[slug]", { slug: article.slug })}
                  className="hover:text-brand-ink hover:underline"
                >
                  {article.title}
                </Link>
              </h2>
              <p className="text-body text-ink-muted">{article.description}</p>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
