/*
 * The local ports of a product: the app, its Postgres, the mail catcher's page and its SMTP (which
 * the development server on the host sends to), and the production image
 * that `pnpm verify` boots. They move together, by the app port, so two products (or a product and
 * the base) can run their composes at once. `ports.json` holds them for every script and spec that
 * can read it; the compose file and the documents that name a port are rewritten.
 */

export type Ports = { app: number; database: number; mail: number; smtp: number; image: number };

const DATABASE_OFFSET = 140;
const MAIL_OFFSET = -270;
const SMTP_OFFSET = -269;
const IMAGE_OFFSET = 99;
const STEP = 10;
const LOWEST = 47_000;
const HIGHEST = 48_900;

export const portsFor = (app: number): Ports => ({
  app,
  database: app + DATABASE_OFFSET,
  mail: app + MAIL_OFFSET,
  smtp: app + SMTP_OFFSET,
  image: app + IMAGE_OFFSET,
});

export function validatePorts(app: number): string[] {
  if (!Number.isInteger(app) || app % STEP !== 0 || app < LOWEST || app > HIGHEST) {
    return [`ports must be an app port between ${LOWEST} and ${HIGHEST}, a multiple of ${STEP}`];
  }
  return [];
}

/** Writes each old port as its new one, only where it stands as a whole number. */
export function rewritePorts(text: string, from: Ports, to: Ports): string {
  const map = new Map(
    (Object.keys(from) as (keyof Ports)[]).map((key) => [String(from[key]), String(to[key])]),
  );
  const pattern = new RegExp(`\\b(${[...map.keys()].join("|")})\\b`, "g");
  return text.replace(pattern, (port) => map.get(port) ?? port);
}

export const renderPorts = (ports: Ports): string => `${JSON.stringify(ports, null, 2)}\n`;
