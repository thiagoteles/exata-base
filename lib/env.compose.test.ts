import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { SEED_ADMIN_EMAIL } from "@/lib/db/seed";
import ports from "@/ports.json" with { type: "json" };
import { defaultAuthProvider, developmentDefaults } from "./env";

/*
 * `docker compose up` and `pnpm dev` on the host are the same development server. The compose once
 * set AUTH_PROVIDER=local while the code defaulted to Clerk, so the host crashed asking for Clerk
 * keys and nobody saw it. Every value the compose sets must be the code's own development default,
 * or be listed here with why it only makes sense inside the container.
 */

type Service = { environment?: Record<string, string>; ports?: string[] };
const compose = parse(readFileSync("docker-compose.yml", "utf8")) as {
  services: Partial<Record<string, Service>>;
};

const containerOnly: Record<string, string> = {
  NODE_ENV: "the development server sets it itself on the host",
  NODE_OPTIONS: "the container's memory, not the host's",
  npm_config_update_notifier: "the container's package manager",
  CI: "keeps the container from installing the host's git hooks",
  LEFTHOOK: "keeps the container from installing the host's git hooks",
  TZ: "the container has no time zone; the host has the machine's",
  DATABASE_URL: "the compose reaches Postgres by its service name; the host by the published port",
  SMTP_LOCAL_URL:
    "the compose reaches the catcher by its service name; the host by the published port",
};

const codeDefaults: Record<string, string> = {
  ...developmentDefaults,
  AUTH_PROVIDER: defaultAuthProvider("development", undefined),
  APP_URL: `http://localhost:${ports.app}`,
};

describe("the development server on the host and in the compose", () => {
  it("get the same value for everything the compose sets", () => {
    const environment = compose.services["app"]?.environment ?? {};
    const different = Object.entries(environment)
      .filter(([name]) => !(name in containerOnly))
      .filter(([name, value]) => codeDefaults[name] !== String(value))
      .map(([name, value]) => `${name}: compose ${value}, code ${codeDefaults[name] ?? "(none)"}`);
    expect(different).toEqual([]);
  });

  it("reach the same database and mail catcher, through the ports the compose publishes", () => {
    expect(compose.services["postgres"]?.ports).toContain(`${ports.database}:5432`);
    expect(compose.services["mailpit"]?.ports).toContain(`${ports.smtp}:1025`);
    expect(developmentDefaults.SMTP_LOCAL_URL).toBe(`smtp://localhost:${ports.smtp}`);
  });

  it("make the seeded admin an admin", () => {
    expect(developmentDefaults.ADMIN_EMAILS).toBe(SEED_ADMIN_EMAIL);
  });
});
