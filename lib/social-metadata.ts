import type { Metadata } from "next";
import { connection } from "next/server";
import { env } from "@/lib/env";
import { publicPathOf } from "@/lib/i18n/public-paths";

/*
 * Next does not merge a page's partial `openGraph` with the layout's, so a page that sets its own
 * title loses the image. Every page builds its social metadata here, and every URL is absolute.
 * The URLs are built per request: the production image is built with no environment, so an
 * address resolved while prerendering would carry the build's default host, not the product's.
 */

const DEFAULT_IMAGE = "/opengraph-image";

type SocialInput = {
  title: string;
  description: string;
  path: `/${string}`;
  image?: `/${string}`;
};

export async function buildSocialMetadata({
  title,
  description,
  path,
  image,
}: SocialInput): Promise<Metadata> {
  await connection();
  // Pages pass their route address; the canonical is the address a visitor sees.
  const url = new URL(publicPathOf(path) ?? path, env.APP_URL).toString();
  const imageUrl = new URL(image ?? DEFAULT_IMAGE, env.APP_URL).toString();
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      title,
      description,
      url,
      images: [{ url: imageUrl }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}
