import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { robotsFor } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return robotsFor(env.APP_URL, env.NODE_ENV === "production");
}
