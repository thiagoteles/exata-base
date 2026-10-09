/*
 * The security headers that do not depend on the environment, sent on every response including
 * static files. Browser features are all closed; a product opens the ones it uses here, such as
 * a microphone for an app that listens (`microphone: "self"`).
 */

const openedFeatures: Readonly<Record<string, "self">> = {};

const closedFeatures = ["camera", "microphone", "geolocation", "payment", "usb", "serial", "hid"];

const permissionsPolicy = closedFeatures
  .map((feature) => `${feature}=${openedFeatures[feature] === "self" ? "(self)" : "()"}`)
  .join(", ");

const TWO_YEARS = 63_072_000;

export const securityHeaders: readonly { key: string; value: string }[] = [
  { key: "Strict-Transport-Security", value: `max-age=${TWO_YEARS}; includeSubDomains` },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: permissionsPolicy },
];
