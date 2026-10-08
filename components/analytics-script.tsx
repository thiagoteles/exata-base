import Script from "next/script";
import { env } from "@/lib/env";

/** The Umami script, read from the environment at runtime. Without the variables, nothing renders. */
export function AnalyticsScript() {
  if (env.UMAMI_WEBSITE_ID === undefined || env.UMAMI_SCRIPT_URL === undefined) {
    return null;
  }
  return (
    <Script
      src={env.UMAMI_SCRIPT_URL}
      data-website-id={env.UMAMI_WEBSITE_ID}
      strategy="afterInteractive"
    />
  );
}
