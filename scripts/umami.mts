/*
 * Talks to the product's Umami: everything a full setup needs, and a way to ask for anything else.
 * Written to be driven by a person or by an AI agent: every command prints JSON, and `api` reaches
 * any endpoint the commands do not cover. The `umami` skill explains the workflow.
 *
 *   pnpm umami <command> [flags]
 *
 * Credentials come from the environment, or from `.env.umami` or `.env.local` (both ignored by
 * git), never from flags:
 *   UMAMI_URL                    the server, such as https://analytics.example.com (UMAMI_ADDRESS
 *                                works too); when absent, the origin of UMAMI_SCRIPT_URL
 *   UMAMI_USERNAME, UMAMI_PASSWORD   a self-hosted user
 *   UMAMI_API_KEY                Umami Cloud, instead of a user (UMAMI_URL=https://api.umami.is/v1)
 *   UMAMI_WEBSITE_ID             the default for --website
 *   APP_URL                      the default for setup's --domain
 */

import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import process, { env, loadEnvFile, stderr, stdout } from "node:process";
import { parseArgs } from "node:util";
import { createUmamiClient, type UmamiClient } from "./umami/client";
import { planReports, type SavedReport, standardReports } from "./umami/reports";

const help = `pnpm umami <command> [flags]

Reading
  whoami                                   the signed-in user
  websites                                 every website the user can see
  reports --website <id>                   the saved reports
  stats --website <id> [--days 30]         page views, visitors, visits, bounces, time
  events --website <id> [--days 30]        event names and counts
  properties --website <id> [--days 30]    event properties and how often each appears
  run --website <id> --type <type> [--parameters <json>] [--days 30]
                                           runs a report (funnel, goal, journey, retention,
                                           revenue, utm, attribution, breakdown) without saving it

Changing
  setup [--domain <host>] [--name <name>] [--currency BRL]
                                           finds or creates the website for the domain, then
                                           creates or corrects the standard reports; idempotent;
                                           prints the environment lines for the app
  website:create --name <name> --domain <host>
  website:update --website <id> [--name <name>] [--domain <host>]
  share --website <id> --on | --off        a public read-only link to the dashboard
  report:delete --report <id> --yes
  website:reset --website <id> --yes      erases every event, keeps the website
  website:delete --website <id> --yes     erases the website and its data

Anything else
  api <METHOD> <path> [json]               any endpoint, such as: api GET /api/me/websites`;

const DAY_MS = 86_400_000;
const SHARE_BYTES = 8;
const LIST = "pageSize=200";
const MY_WEBSITES = `/api/me/websites?${LIST}`;

// A variable already in the environment wins; then .env.umami, then .env.local, which holds the
// test credentials a person leaves for local work.
for (const file of [".env.umami", ".env.local"]) {
  if (existsSync(file)) {
    loadEnvFile(file);
  }
}

// Read once, after the optional file is loaded, so every command sees the same settings.
const {
  UMAMI_ADDRESS,
  UMAMI_URL = UMAMI_ADDRESS,
  UMAMI_SCRIPT_URL,
  UMAMI_API_KEY,
  UMAMI_USERNAME,
  UMAMI_PASSWORD,
  UMAMI_WEBSITE_ID,
  APP_URL,
} = env;

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    website: { type: "string" },
    report: { type: "string" },
    type: { type: "string" },
    parameters: { type: "string" },
    days: { type: "string", default: "30" },
    domain: { type: "string" },
    name: { type: "string" },
    currency: { type: "string", default: "BRL" },
    on: { type: "boolean", default: false },
    off: { type: "boolean", default: false },
    yes: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  stderr.write(`${message}\n`);
  process.exit(1);
}

function connect(): UmamiClient {
  const url =
    UMAMI_URL ?? (UMAMI_SCRIPT_URL === undefined ? undefined : new URL(UMAMI_SCRIPT_URL).origin);
  if (url === undefined) {
    fail("Set UMAMI_URL (or UMAMI_SCRIPT_URL) to the Umami server.");
  }
  if (UMAMI_API_KEY !== undefined) {
    return createUmamiClient({ url, apiKey: UMAMI_API_KEY });
  }
  if (UMAMI_USERNAME === undefined || UMAMI_PASSWORD === undefined) {
    fail(
      "Set UMAMI_USERNAME and UMAMI_PASSWORD, or UMAMI_API_KEY, in the environment or .env.umami.",
    );
  }
  return createUmamiClient({ url, username: UMAMI_USERNAME, password: UMAMI_PASSWORD });
}

const website = (): string =>
  flags.website ?? UMAMI_WEBSITE_ID ?? fail("Pass --website <id> or set UMAMI_WEBSITE_ID.");

function confirmed(what: string): void {
  if (!flags.yes) {
    fail(`${what} cannot be undone. Run it again with --yes.`);
  }
}

type Website = { id: string; name: string; domain: string; shareId: string | null };
type Page<T> = { data: T[] };
type Context = { umami: UmamiClient; startAt: number; endAt: number; args: string[] };

async function ensureWebsite(umami: UmamiClient, domain: string, name: string) {
  const { data } = await umami.call<Page<Website>>("GET", MY_WEBSITES);
  const found = data.find((row) => row.domain === domain);
  if (found !== undefined) {
    return { site: found, created: false };
  }
  return {
    site: await umami.call<Website>("POST", "/api/websites", { name, domain }),
    created: true,
  };
}

async function setup({ umami }: Context) {
  const domain =
    flags.domain ??
    (APP_URL === undefined
      ? fail("Pass --domain <host> or set APP_URL.")
      : new URL(APP_URL).hostname);
  const { site, created } = await ensureWebsite(umami, domain, flags.name ?? domain);
  const existing = await umami.call<Page<SavedReport>>(
    "GET",
    `/api/reports?websiteId=${site.id}&${LIST}`,
  );
  const plan = planReports(existing.data, standardReports(flags.currency));
  for (const report of plan.create) {
    // biome-ignore lint/performance/noAwaitInLoops: a handful of reports, created in a stable order
    await umami.call("POST", "/api/reports", { websiteId: site.id, ...report });
  }
  for (const { id, ...report } of plan.update) {
    // biome-ignore lint/performance/noAwaitInLoops: a handful of reports, corrected in order
    await umami.call("POST", `/api/reports/${id}`, { websiteId: site.id, ...report });
  }
  return {
    website: { id: site.id, name: site.name, domain: site.domain, created },
    reports: {
      created: plan.create.map((report) => report.name),
      corrected: plan.update.map((report) => report.name),
      unchanged: plan.keep,
    },
    environment: [`UMAMI_WEBSITE_ID=${site.id}`, `UMAMI_SCRIPT_URL=${umami.url}/script.js`],
  };
}

function runReport({ umami, startAt, endAt }: Context) {
  const type = flags.type ?? fail("Pass --type, such as funnel or goal.");
  const parameters = JSON.parse(flags.parameters ?? "{}") as Record<string, unknown>;
  return umami.call("POST", `/api/reports/${type}`, {
    websiteId: website(),
    type,
    filters: {},
    parameters: {
      startDate: new Date(startAt).toISOString(),
      endDate: new Date(endAt).toISOString(),
      ...parameters,
    },
  });
}

async function share({ umami }: Context) {
  if (flags.on === flags.off) {
    fail("Pass --on or --off.");
  }
  const shareId = flags.on ? randomBytes(SHARE_BYTES).toString("hex") : null;
  const updated = await umami.call<Website>("POST", `/api/websites/${website()}`, { shareId });
  return {
    shareId: updated.shareId,
    url: updated.shareId === null ? null : `${umami.url}/share/${updated.shareId}`,
  };
}

function raw({ umami, args }: Context) {
  const [method, path, body] = args;
  if (method === undefined || path === undefined) {
    fail("Usage: api <METHOD> <path> [json]");
  }
  return umami.call(method.toUpperCase(), path, body === undefined ? undefined : JSON.parse(body));
}

const period = ({ startAt, endAt }: Context) => `startAt=${startAt}&endAt=${endAt}`;

const commands: Record<string, (context: Context) => Promise<unknown>> = {
  whoami: ({ umami }) => umami.call("GET", "/api/me"),
  websites: ({ umami }) => umami.call("GET", MY_WEBSITES),
  reports: ({ umami }) => umami.call("GET", `/api/reports?websiteId=${website()}&${LIST}`),
  stats: (context) =>
    context.umami.call("GET", `/api/websites/${website()}/stats?${period(context)}`),
  events: (context) =>
    context.umami.call("GET", `/api/websites/${website()}/metrics?type=event&${period(context)}`),
  properties: (context) =>
    context.umami.call(
      "GET",
      `/api/websites/${website()}/event-data/properties?${period(context)}`,
    ),
  run: runReport,
  setup,
  "website:create": ({ umami }) =>
    umami.call("POST", "/api/websites", {
      name: flags.name ?? fail("Pass --name."),
      domain: flags.domain ?? fail("Pass --domain."),
    }),
  "website:update": ({ umami }) =>
    umami.call("POST", `/api/websites/${website()}`, {
      ...(flags.name === undefined ? {} : { name: flags.name }),
      ...(flags.domain === undefined ? {} : { domain: flags.domain }),
    }),
  share,
  "report:delete": ({ umami }) => {
    confirmed("Deleting a report");
    return umami.call("DELETE", `/api/reports/${flags.report ?? fail("Pass --report <id>.")}`);
  },
  "website:reset": ({ umami }) => {
    confirmed("Erasing a website's events");
    return umami.call("POST", `/api/websites/${website()}/reset`);
  },
  "website:delete": ({ umami }) => {
    confirmed("Deleting a website");
    return umami.call("DELETE", `/api/websites/${website()}`);
  },
  api: raw,
};

const [commandName, ...rest] = positionals;
if (commandName === undefined || flags.help) {
  stdout.write(`${help}\n`);
} else {
  const command = commands[commandName] ?? fail(`Unknown command "${commandName}".\n\n${help}`);
  const endAt = Date.now();
  const context = {
    umami: connect(),
    startAt: endAt - Number(flags.days) * DAY_MS,
    endAt,
    args: rest,
  };
  try {
    stdout.write(`${JSON.stringify(await command(context), null, 2)}\n`);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
