import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { articles } from "@/lib/content/articles-index";
import { env } from "@/lib/env";
import { renderFeed } from "@/lib/feed";
import { publicPathOf } from "@/lib/i18n/public-paths";
import { timedRoute } from "@/lib/timed-route";

/** The articles as RSS, newest first, with the runtime address. */
export const GET = timedRoute("/feed.xml", async () => {
  await connection();
  const t = await getTranslations("articles");
  const absolute = (path: string) => new URL(publicPathOf(path) ?? path, env.APP_URL).toString();
  const xml = renderFeed({
    title: t("title"),
    description: t("subtitle"),
    url: absolute("/articles"),
    items: articles.map((article) => ({
      title: article.title,
      description: article.description,
      url: absolute(`/articles/${article.slug}`),
      publishedAt: new Date(`${article.publishedAt}T12:00:00Z`),
    })),
  });
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
});
