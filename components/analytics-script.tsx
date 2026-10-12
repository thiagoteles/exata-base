import Script from "next/script";
import { connection } from "next/server";
import { Suspense } from "react";
import { WebVitals } from "./web-vitals";

/**
 * The Umami script and the Web Vitals report, read from the environment at runtime. Without the
 * variables, nothing renders. It streams in behind its own boundary: read while prerendering, it
 * would keep the build's environment, which has no analytics, in every static page.
 */
export function AnalyticsScript() {
  return (
    <Suspense>
      <RuntimeAnalytics />
    </Suspense>
  );
}

async function RuntimeAnalytics() {
  await connection();
  // Loaded here, not imported: the root layout reaches every page, and so would the environment.
  const { env } = await import("@/lib/env");
  if (env.UMAMI_WEBSITE_ID === undefined || env.UMAMI_SCRIPT_URL === undefined) {
    return null;
  }
  return (
    <>
      <Script
        src={env.UMAMI_SCRIPT_URL}
        data-website-id={env.UMAMI_WEBSITE_ID}
        strategy="afterInteractive"
      />
      <WebVitals />
    </>
  );
}
