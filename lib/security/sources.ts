import { env } from "@/lib/env";
import { authCspSources } from "@/lib/ports/auth/csp";
import type { CspSources } from "./csp";

/*
 * Every origin the browser may reach, as each part declares it. A product that loads something new
 * in the page adds its declaration here, so the policy never grows by hand.
 */
export function cspSources(): CspSources[] {
  const umami = env.UMAMI_SCRIPT_URL === undefined ? null : new URL(env.UMAMI_SCRIPT_URL).origin;
  return [
    authCspSources(env.AUTH_PROVIDER, env.CLERK_PUBLISHABLE_KEY),
    umami === null ? {} : { "script-src": [umami], "connect-src": [umami] },
  ];
}
