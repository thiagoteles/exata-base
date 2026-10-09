/*
 * Where a Clerk user manages their own sessions and devices: the hosted account portal, whose
 * address follows from the publishable key. The key carries the frontend host in base64 with a
 * trailing `$`. A development instance (`<slug>.clerk.accounts.dev`) has its portal at
 * `<slug>.accounts.dev`; a production one (`clerk.<domain>`) at `accounts.<domain>`. Null when the
 * key does not say.
 */
const HOST = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
const DEV_SUFFIX = /\.clerk\.accounts\.dev$/;
const PROD_PREFIX = /^clerk\./;
const TRAILING_DOLLAR = /\$$/;

export function clerkProfileUrl(publishableKey: string | undefined): string | null {
  const encoded = publishableKey?.split("_").at(2);
  if (encoded === undefined) {
    return null;
  }
  const host = Buffer.from(encoded, "base64").toString("utf8").replace(TRAILING_DOLLAR, "");
  if (!HOST.test(host)) {
    return null;
  }
  const portal = host.endsWith(".clerk.accounts.dev")
    ? host.replace(DEV_SUFFIX, ".accounts.dev")
    : host.replace(PROD_PREFIX, "accounts.");
  return portal === host ? null : `https://${portal}/user`;
}
