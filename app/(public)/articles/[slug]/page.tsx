import type { MDXContent } from "mdx/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { findArticle } from "@/lib/content/articles";
import { articles } from "@/lib/content/articles-index";
import { frontmatterSchema } from "@/lib/content/frontmatter";
import { formatDate, type IsoDate } from "@/lib/date";
import { env } from "@/lib/env";
import { publicHref, publicPathOf } from "@/lib/i18n/public-paths";
import { buildSocialMetadata } from "@/lib/social-metadata";
import { breadcrumbData, structuredArticle } from "@/lib/structured-data";
import { z } from "@/lib/validation";

// Every article in the index is prerendered; the proxy answers any other slug with a real 404.
export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

const moduleSchema = z.object({
  default: z.custom<MDXContent>((value) => typeof value === "function"),
  frontmatter: frontmatterSchema,
});

async function load(slug: string) {
  if (findArticle(slug) === undefined) {
    notFound();
  }
  const loaded: unknown = await import(`@/content/pt-BR/articles/${slug}.mdx`);
  const parsed = moduleSchema.safeParse(loaded);
  if (!parsed.success) {
    throw new Error(`articles/${slug}: invalid frontmatter\n${z.prettifyError(parsed.error)}`);
  }
  return { Content: parsed.data.default, frontmatter: parsed.data.frontmatter };
}

export async function generateMetadata({
  params,
}: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { frontmatter } = await load(slug);
  return await buildSocialMetadata({
    title: frontmatter.title,
    description: frontmatter.description,
    path: `/articles/${slug}`,
    article: {
      publishedAt: new Date(`${frontmatter.publishedAt}T12:00:00Z`),
      ...(frontmatter.updatedAt === undefined
        ? {}
        : { modifiedAt: new Date(`${frontmatter.updatedAt}T12:00:00Z`) }),
    },
  });
}

export default function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  return (
    <Suspense>
      <Article params={params} />
    </Suspense>
  );
}

/** Reads the address, so it streams in behind the shell instead of blocking it. */
async function Article({ params }: { params: PageProps<"/articles/[slug]">["params"] }) {
  const { slug } = await params;
  const [{ Content, frontmatter }, t] = await Promise.all([
    load(slug),
    getTranslations("articles"),
  ]);
  return (
    <main className="mx-auto flex w-full max-w-170 flex-col gap-8 px-4 py-12 md:py-18">
      <Breadcrumb
        label={t("trail")}
        items={[
          { label: t("home"), href: "/" },
          { label: t("title"), href: publicHref("/articles") },
          { label: frontmatter.title },
        ]}
      />
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="text-page-title text-ink">{frontmatter.title}</h1>
          <p className="text-body text-ink-muted">{frontmatter.description}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-small text-ink-muted">
            <span>{t("by", { author: frontmatter.author })}</span>
            <span className="tabular-nums">
              {t("published", { date: formatDate(frontmatter.publishedAt as IsoDate) })}
            </span>
            {frontmatter.updatedAt === undefined ? null : (
              <span className="tabular-nums">
                {t("updated", { date: formatDate(frontmatter.updatedAt as IsoDate) })}
              </span>
            )}
          </p>
        </header>
        <div className="flex flex-col gap-5">
          <Content />
        </div>
      </article>
      <Suspense>
        <ArticleData slug={slug} />
      </Suspense>
    </main>
  );
}

/** The article for search engines, with its runtime address. */
async function ArticleData({ slug }: { slug: string }) {
  await connection();
  const article = findArticle(slug);
  if (article === undefined) {
    return null;
  }
  const t = await getTranslations("articles");
  const path = publicPathOf(`/articles/${slug}`) ?? `/articles/${slug}`;
  return (
    <>
      <JsonLd data={structuredArticle(new URL(path, env.APP_URL).toString(), article)} />
      <JsonLd
        data={breadcrumbData(env.APP_URL, [
          { name: t("home"), path: publicPathOf("/") ?? "/" },
          { name: t("title"), path: publicPathOf("/articles") ?? "/articles" },
          { name: article.title },
        ])}
      />
    </>
  );
}
