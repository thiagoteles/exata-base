import { Buffer } from "node:buffer";
import process from "node:process";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

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
  APP_URL: z.url().default("http://localhost:3300"),
  // biome-ignore lint/security/noSecrets: the local compose credentials are public by design
  DATABASE_URL: z.url().default("postgres://app:app@localhost:5440/app"),
  ADMIN_EMAILS: csv.pipe(z.array(z.email())).default([]),
  // Which proxy writes the client address: Traefik (Coolify) appends it to X-Forwarded-For,
  // Cloudflare sends CF-Connecting-IP. Only that value is trusted, never one the caller wrote.
  TRUSTED_PROXY: z.enum(["traefik", "cloudflare"]).default("traefik"),

  BETTER_AUTH_SECRET: z.string().min(32).default("local-development-secret-not-for-production"),
  CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
  CLERK_SECRET_KEY: z.string().startsWith("sk_").optional(),
  CLERK_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  SMTP_LOCAL_URL: z.url().optional(),
  MAILTRAP_TOKEN: z.string().min(1).optional(),
  MAILTRAP_INBOX: z.string().regex(/^\d+$/).optional(),
  EMAIL_FROM: z.email().default("no-reply@app.local"),
  CONTACT_EMAIL: csv.pipe(z.array(z.email())).default([]),

  CRON_SECRET: z.string().min(32).optional(),

  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_PRICE_MONTHLY: z.string().startsWith("price_").optional(),
  STRIPE_PRICE_YEARLY: z.string().startsWith("price_").optional(),
  STRIPE_PRICE_LIFETIME: z.string().startsWith("price_").optional(),

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

  STORAGE_DIR: z.string().min(1).default(".storage"),
  FILE_URL_SECRET: z.string().min(32).default("local-development-file-url-secret"),
  UPLOAD_MAX_MB: z.coerce.number().int().positive().max(100).default(10),
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
    required.push("CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "CLERK_WEBHOOK_SECRET");
  }
  if (isSet(raw, "MAILTRAP_TOKEN")) {
    required.push("EMAIL_FROM");
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

  if (isSet(raw, "SMTP_LOCAL_URL")) {
    issues.push("SMTP_LOCAL_URL is for the local compose only and must not be set in production");
  }

  return issues;
}

// The build parses too, so every default applies; only the production requirements wait for boot.
const isBuild = process.env["NEXT_PHASE"] === "phase-production-build";
const productionRuntime = process.env["NODE_ENV"] === "production" && !isBuild;

export const env = createEnv({
  server,
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  createFinalSchema: (shape) =>
    z.object(shape).superRefine((parsed, context) => {
      for (const message of environmentIssues(parsed, process.env, productionRuntime)) {
        context.addIssue({ code: "custom", message });
      }
    }),
});
