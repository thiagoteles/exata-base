import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { env } from "@/lib/env";
import { defaultLocale, isLocale, isMultilingual, type Locale, locales } from "@/lib/i18n/locales";
import { pathInLocale } from "@/lib/i18n/negotiate";
import { publicPathOf } from "@/lib/i18n/public-paths";

/*
 * Next does not merge a page's partial `openGraph` with the layout's, so a page that sets its own
 * title loses the image. Every page builds its social metadata here, and every URL is absolute.
 * The URLs are built per request: the production image is built with no environment, so an
 * address resolved while prerendering would carry the build's default host, not the product's.
 */

const DEFAULT_IMAGE = "/opengraph-image";
const HOME = "/";

type SocialInput = {
  title: string;
  description: string;
  /** The route address; the canonical is its public address. */
  path: `/${string}`;
  image?: `/${string}`;
  /** An article carries its dates; anything else is a website page. */
  article?: { publishedAt: Date; modifiedAt?: Date };
  /** False for pages that should not be listed: filtered searches, later pages, empty states. */
  index?: boolean;
};

const ogLocale = (locale: Locale) => locale.replace("-", "_");

export async function buildSocialMetadata({
  title,
  description,
  path,
  image,
  article,
  index = true,
}: SocialInput): Promise<Metadata> {
  await connection();
  const visible = publicPathOf(path) ?? path;
  const asked = isMultilingual ? await getLocale() : defaultLocale;
  const locale = isLocale(asked) ? asked : defaultLocale;
  const absolute = (pathname: string) => new URL(pathname, env.APP_URL).toString();
  const url = absolute(pathInLocale(visible, locale));
  const imageUrl = absolute(image ?? DEFAULT_IMAGE);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      ...(isMultilingual
        ? {
            languages: {
              ...Object.fromEntries(
                locales.map((each) => [each, absolute(pathInLocale(visible, each))]),
              ),
              "x-default": absolute(visible),
            },
          }
        : {}),
    },
    ...(index ? {} : { robots: { index: false, follow: true } }),
    ...(path === HOME && env.GOOGLE_SITE_VERIFICATION !== undefined
      ? { verification: { google: env.GOOGLE_SITE_VERIFICATION } }
      : {}),
    openGraph: {
      ...(article === undefined
        ? { type: "website" as const }
        : {
            type: "article" as const,
            publishedTime: article.publishedAt.toISOString(),
            ...(article.modifiedAt === undefined
              ? {}
              : { modifiedTime: article.modifiedAt.toISOString() }),
          }),
      locale: ogLocale(locale),
      ...(isMultilingual
        ? { alternateLocale: locales.filter((each) => each !== locale).map(ogLocale) }
        : {}),
      title,
      description,
      url,
      images: [{ url: imageUrl }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}
