import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { sitemapFor } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapFor(env.APP_URL);
}
