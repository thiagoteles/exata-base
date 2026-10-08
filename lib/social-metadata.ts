import type { Metadata } from "next";
import { env } from "@/lib/env";

/*
 * Next does not merge a page's partial `openGraph` with the layout's, so a page that sets its own
 * title loses the image. Every page builds its social metadata here, and every URL is absolute.
 */

const DEFAULT_IMAGE = "/opengraph-image";

type SocialInput = {
  title: string;
  description: string;
  path: `/${string}`;
  image?: `/${string}`;
};

export function buildSocialMetadata({ title, description, path, image }: SocialInput): Metadata {
  const url = new URL(path, env.APP_URL).toString();
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
