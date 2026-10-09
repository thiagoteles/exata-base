import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { env } from "@/lib/env";
import { sitemapFor } from "@/lib/seo";

// Read per request: the image is built with no environment, so the build would bake its default host.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return sitemapFor(env.APP_URL);
}
