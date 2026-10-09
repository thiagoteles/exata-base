import { type CspSources, clerkFrontendHost } from "@/lib/security/csp";

/*
 * What the hosted sign-in loads in the browser: its Frontend API (scripts and calls), its images,
 * and the bot check it embeds. The local mode loads nothing from outside.
 */
export function authCspSources(provider: "clerk" | "local", publishableKey?: string): CspSources {
  const host = publishableKey === undefined ? null : clerkFrontendHost(publishableKey);
  if (provider !== "clerk" || host === null) {
    return {};
  }
  const api = `https://${host}`;
  return {
    "script-src": [api, "https://challenges.cloudflare.com"],
    "connect-src": [api],
    "img-src": ["https://img.clerk.com"],
    "frame-src": ["https://challenges.cloudflare.com"],
  };
}
