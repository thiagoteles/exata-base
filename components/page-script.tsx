"use client";

import { pageScript } from "@/lib/theme";

/**
 * Applies the person's saved preferences to the page before the first paint. The server renders
 * a script the browser runs once; in the browser React gets an inert type, so it neither warns
 * about a script in a component nor runs it a second time.
 */
export function PageScript() {
  return (
    <script
      type={typeof globalThis.window === "undefined" ? undefined : "application/json"}
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script, no user input
      dangerouslySetInnerHTML={{ __html: pageScript }}
    />
  );
}
