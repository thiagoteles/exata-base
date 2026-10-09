import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { env } from "@/lib/env";
import { robotsFor } from "@/lib/seo";

// Read per request: the image is built with no environment, so the build would bake its default host.
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  return robotsFor(env.APP_URL, env.NODE_ENV === "production");
}
