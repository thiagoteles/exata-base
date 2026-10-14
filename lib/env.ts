import { Buffer } from "node:buffer";
import process from "node:process";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { parseIngestSecrets } from "@/lib/ingest/secrets";
import ports from "@/ports.json" with { type: "json" };

/*
 * The only module that reads process.env. Every variable, its local default and what makes the
 * production boot fail are described here. Defaults are the values of the local compose, so the
 * app runs with no .env file. In production, required variables must be set explicitly: a local
 * default never reaches a real deployment. `next build` needs no variable at all.
 */

const csv = z.string().transform((value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
);

const ingestSecrets = z.string().transform((value, context) => {
  try {
    return parseIngestSecrets(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "INGEST_SECRETS is not valid",
    });
    return z.NEVER;
  }
});

const gcpCredentials = z
  .string()
  .transform((value, context) => {
    try {
      return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "GCP_CREDENTIALS is not base64-encoded JSON" });
      return z.NEVER;
    }
  })
  .pipe(
    z.object({
      type: z.literal("service_account"),
      project_id: z.string().min(1),
      client_email: z.email(),
      private_key: z.string().startsWith("-----BEGIN PRIVATE KEY-----"),
    }),
  );

const server = {
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_PROVIDER: z.enum(["clerk", "local"]).default("clerk"),
  APP_URL: z.url().default(`http://localhost:${ports.app}`),
  DATABASE_URL: z.url().default(`postgres://app:app@localhost:${ports.database}/app`),
  ADMIN_EMAILS: csv.pipe(z.array(z.email())).default([]),
  // Which proxy writes the client address: Traefik (Coolify) appends it to X-Forwarded-For,
  // Cloudflare sends CF-Connecting-IP. Only that value is trusted, never one the caller wrote.
  TRUSTED_PROXY: z.enum(["traefik", "cloudflare"]).default("traefik"),

  BETTER_AUTH_SECRET: z.string().min(32).default("local-development-secret-not-for-production"),
  CLERK_SECRET_KEY: z.string().startsWith("sk_").optional(),
  CLERK_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  SMTP_LOCAL_URL: z.url().optional(),
  MAILTRAP_TOKEN: z.string().min(1).optional(),
  MAILTRAP_INBOX: z.string().regex(/^\d+$/).optional(),
  EMAIL_FROM: z.email().default("no-reply@app.local"),
  CONTACT_EMAIL: csv.pipe(z.array(z.email())).default([]),

  // Exact origins (scheme and host, no path) whose web pages may read the API's answers.
  API_ALLOWED_ORIGINS: csv
    .pipe(z.array(z.url()))
    .refine((list) => list.every((item) => new URL(item).origin === item), {
      message: "API_ALLOWED_ORIGINS must be origins like https://app.example.com, with no path",
    })
    .default([]),
  CRON_SECRET: z.string().min(32).optional(),
  // `source=secret` pairs, one secret per source a worker outside the server may deliver to.
  INGEST_SECRETS: ingestSecrets.default({}),

  // A secret key (sk_) or a restricted one (rk_), which Stripe recommends: it needs to write Checkout
  // Sessions, Customers, the customer portal and Refunds, and to read the rest it is sent.
  STRIPE_SECRET_KEY: z
    .string()
    .regex(/^(sk|rk)_/)
    .optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),

  GCP_CREDENTIALS: gcpCredentials.optional(),
  GCP_PROJECT: z.string().min(1).optional(),
  GCS_BUCKET: z.string().min(1).optional(),

  UMAMI_WEBSITE_ID: z.uuid().optional(),
  UMAMI_SCRIPT_URL: z.url().optional(),
  // The token Search Console gives for the meta tag method; it goes on the home page only.
  GOOGLE_SITE_VERIFICATION: z.string().min(1).optional(),
  // The deployed commit, which Coolify passes to the container; errors are grouped per version.
  SOURCE_COMMIT: z.string().min(1).optional(),
  // The service name errors are reported under, when several products share one Google project.
  SERVICE_NAME: z.string().min(1).default("app"),
  // Marco Civil, art. 15: a product run for profit keeps access records (address and time) for
  // six months. On, the proxy writes one access line per request to a log of its own.
  ACCESS_LOG: z.enum(["on", "off"]).default("off"),
  // The production build run on this machine for the browser suite: seeded, closed to search
  // engines and sending mail to the local catcher. Refused unless APP_URL is this machine.
  LOCAL_STACK: z.enum(["on", "off"]).default("off"),

  STORAGE_DIR: z.string().min(1).default(".storage"),
  FILE_URL_SECRET: z.string().min(32).default("local-development-file-url-secret"),
  // Signs the unsubscribe link in reminders and newsletters; see lib/unsubscribe.
  // Signs the address in a document's QR code; see lib/documents.
  DOCUMENT_SECRET: z.string().min(32).default("local-development-document-secret"),
  UNSUBSCRIBE_SECRET: z.string().min(32).default("local-development-unsubscribe-secret"),
  UPLOAD_MAX_MB: z.coerce.number().int().positive().max(100).default(10),
  // The total size of the files attached to one e-mail; over it the send is refused, whole.
  EMAIL_ATTACHMENTS_MAX_MB: z.coerce.number().int().positive().max(40).default(10),
  UPLOAD_TYPES: csv
    .pipe(z.array(z.string().regex(/^[a-z]+\/[a-z0-9.+-]+$/)).min(1))
    .default(["image/png", "image/jpeg", "image/webp", "application/pdf"]),
};

type ServerShape = typeof server;
type ParsedEnv = z.output<z.ZodObject<ServerShape>>;
type RawEnv = Readonly<Record<string, string | undefined>>;

/** Variables that only make sense together: all set, or none. */
const groups: ReadonlyArray<ReadonlyArray<keyof ServerShape>> = [
  ["GCP_CREDENTIALS", "GCP_PROJECT", "GCS_BUCKET"],
  ["UMAMI_WEBSITE_ID", "UMAMI_SCRIPT_URL"],
  ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
];

const localHosts = new Set(["localhost", "127.0.0.1"]);
const CLERK_KEY = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY";

const isSet = (raw: RawEnv, name: string) => (raw[name] ?? "").trim().length > 0;

/**
 * The rules that span more than one variable. `isProductionRuntime` is true when a production
 * server boots, and false during `next build`, which must work with no secrets at all.
 */
export function environmentIssues(
  parsed: ParsedEnv,
  raw: RawEnv,
  isProductionRuntime: boolean,
): string[] {
  const issues: string[] = [];

  for (const group of groups) {
    const present = group.filter((name) => isSet(raw, name));
    if (present.length > 0 && present.length < group.length) {
      const missing = group.filter((name) => !present.includes(name));
      issues.push(`${missing.join(", ")} must be set together with ${present.join(", ")}`);
    }
  }

  if (!isProductionRuntime) {
    return issues;
  }

  const required: string[] = ["APP_URL", "DATABASE_URL"];
  if (parsed.AUTH_PROVIDER === "local") {
    required.push("BETTER_AUTH_SECRET");
  } else {
    required.push("CLERK_SECRET_KEY", "CLERK_WEBHOOK_SECRET");
  }
  if (isSet(raw, "MAILTRAP_TOKEN")) {
    // Real mail means reminders and news can exist, and each carries a link only this secret signs.
    required.push("EMAIL_FROM", "UNSUBSCRIBE_SECRET");
  }
  // With payments on, a receipt carries a QR code only this secret can sign.
  if (isSet(raw, "STRIPE_SECRET_KEY")) {
    required.push("DOCUMENT_SECRET");
  }
  // Files on disk open through URLs this secret signs; with Cloud Storage, Google signs them.
  if (!isSet(raw, "GCS_BUCKET")) {
    required.push("FILE_URL_SECRET");
  }
  for (const name of required) {
    if (!isSet(raw, name)) {
      issues.push(`${name} is required in production`);
    }
  }

  return [...issues, ...builtAuthIssues(parsed, raw), ...placeIssues(parsed, raw)];
}

/**
 * The Clerk publishable key is given when the image is built, because the static pages carry
 * Clerk's provider from then on; the provider the server runs with must be the one it was built for.
 */
function builtAuthIssues(parsed: ParsedEnv, raw: RawEnv): string[] {
  const built = isSet(raw, CLERK_KEY);
  if (parsed.AUTH_PROVIDER === "clerk" && !built) {
    return [`${CLERK_KEY} is required when the image is built, for AUTH_PROVIDER=clerk`];
  }
  if (parsed.AUTH_PROVIDER === "local" && built) {
    return [`The image was built with ${CLERK_KEY}, for Clerk, but AUTH_PROVIDER is local`];
  }
  return [];
}

/** The local stack runs only on this machine, and only it may send to the local mail catcher. */
function placeIssues(parsed: ParsedEnv, raw: RawEnv): string[] {
  if (parsed.LOCAL_STACK === "on") {
    return localHosts.has(new URL(parsed.APP_URL).hostname)
      ? []
      : ["LOCAL_STACK is for this machine only and needs APP_URL on localhost"];
  }
  return isSet(raw, "SMTP_LOCAL_URL")
    ? ["SMTP_LOCAL_URL is for the local compose only and must not be set in production"]
    : [];
}

// The build parses too, so every default applies; only the production requirements wait for boot.
const isBuild = process.env["NEXT_PHASE"] === "phase-production-build";
const productionRuntime = process.env["NODE_ENV"] === "production" && !isBuild;

// Written out in full so the bundler puts the build's value here, on the server as in the browser.
const builtClerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const env = createEnv({
  server,
  client: { [CLERK_KEY]: z.string().startsWith("pk_").optional() },
  experimental__runtimeEnv: { [CLERK_KEY]: builtClerkKey },
  emptyStringAsUndefined: true,
  createFinalSchema: (shape) =>
    z.object(shape).superRefine((parsed, context) => {
      const raw = { ...process.env, [CLERK_KEY]: builtClerkKey };
      for (const message of environmentIssues(parsed, raw, productionRuntime)) {
        context.addIssue({ code: "custom", message });
      }
    }),
});

/** Whether this server runs on a developer's machine: the development server, or the local stack. */
export const runsLocally = env.NODE_ENV !== "production" || env.LOCAL_STACK === "on";

declare global {
  // biome-ignore lint/style/noNamespace: the Node types declare the environment in this namespace
  namespace NodeJS {
    // biome-ignore lint/style/useConsistentTypeDefinitions: augmenting an interface takes an interface
    interface ProcessEnv {
      /** Clerk's publishable key, written into the bundles when the image is built. */
      readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
    }
  }
}
