import { describe, expect, it } from "vitest";
import { env, environmentIssues } from "./env";

const local = { ...env, AUTH_PROVIDER: "local" as const };
const clerk = { ...env, AUTH_PROVIDER: "clerk" as const };

describe("environment rules", () => {
  it("refuse a group that is only partly set, in any environment", () => {
    expect(environmentIssues(env, { UMAMI_WEBSITE_ID: "x" }, false)).toEqual([
      "UMAMI_SCRIPT_URL must be set together with UMAMI_WEBSITE_ID",
    ]);
    expect(
      environmentIssues(
        env,
        { STRIPE_SECRET_KEY: "sk_x", STRIPE_WEBHOOK_SECRET: "whsec_x" },
        false,
      ),
    ).toEqual([]);
  });

  it("let a build pass with no variables at all", () => {
    expect(environmentIssues(clerk, {}, false)).toEqual([]);
  });

  it("require explicit values in production instead of local defaults", () => {
    expect(environmentIssues(local, {}, true)).toEqual([
      "APP_URL is required in production",
      "DATABASE_URL is required in production",
      "BETTER_AUTH_SECRET is required in production",
      "FILE_URL_SECRET is required in production",
    ]);
  });

  it("need no file URL secret when Cloud Storage signs the URLs", () => {
    const raw = {
      APP_URL: "https://a.b",
      DATABASE_URL: "postgres://x",
      BETTER_AUTH_SECRET: "s",
      GCP_CREDENTIALS: "c",
      GCP_PROJECT: "p",
      GCS_BUCKET: "b",
    };
    expect(environmentIssues(local, raw, true)).toEqual([]);
  });

  it("require the Clerk keys in production when Clerk is the provider", () => {
    const raw = { APP_URL: "https://a.b", DATABASE_URL: "postgres://x", FILE_URL_SECRET: "f" };
    expect(environmentIssues(clerk, raw, true)).toEqual([
      "CLERK_SECRET_KEY is required in production",
      "CLERK_WEBHOOK_SECRET is required in production",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required when the image is built, for AUTH_PROVIDER=clerk",
    ]);
  });

  it("refuse an image built for one sign-in when the server runs the other", () => {
    const raw = {
      APP_URL: "https://a.b",
      DATABASE_URL: "postgres://x",
      BETTER_AUTH_SECRET: "s",
      FILE_URL_SECRET: "f",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_x",
    };
    expect(environmentIssues(local, raw, true)).toEqual([
      "The image was built with NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, for Clerk, but AUTH_PROVIDER is local",
    ]);
    expect(environmentIssues(local, raw, false)).toEqual([]);
  });

  it("refuse the local mail catcher and require a sender when production sends mail", () => {
    const raw = {
      APP_URL: "https://a.b",
      DATABASE_URL: "postgres://x",
      BETTER_AUTH_SECRET: "s",
      MAILTRAP_TOKEN: "t",
      FILE_URL_SECRET: "f",
      UNSUBSCRIBE_SECRET: "u",
      SMTP_LOCAL_URL: "smtp://mailpit:1025",
    };
    expect(environmentIssues(local, raw, true)).toEqual([
      "EMAIL_FROM is required in production",
      "SMTP_LOCAL_URL is for the local compose only and must not be set in production",
    ]);
  });

  it("require the secret that signs document addresses as soon as production takes payments", () => {
    const raw = {
      APP_URL: "https://a.b",
      DATABASE_URL: "postgres://x",
      BETTER_AUTH_SECRET: "s",
      FILE_URL_SECRET: "f",
      STRIPE_SECRET_KEY: "sk_x",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
    };
    expect(environmentIssues(local, raw, true)).toEqual([
      "DOCUMENT_SECRET is required in production",
    ]);
    expect(environmentIssues(local, { ...raw, DOCUMENT_SECRET: "d" }, true)).toEqual([]);
  });

  it("require the secret that signs unsubscribe links as soon as production sends real mail", () => {
    const raw = {
      APP_URL: "https://a.b",
      DATABASE_URL: "postgres://x",
      BETTER_AUTH_SECRET: "s",
      MAILTRAP_TOKEN: "t",
      EMAIL_FROM: "no-reply@a.b",
      FILE_URL_SECRET: "f",
    };
    expect(environmentIssues(local, raw, true)).toEqual([
      "UNSUBSCRIBE_SECRET is required in production",
    ]);
    expect(environmentIssues(local, { ...raw, UNSUBSCRIBE_SECRET: "u" }, true)).toEqual([]);
  });

  it("let the local stack send to the mail catcher, and only on this machine", () => {
    const raw = {
      APP_URL: "http://localhost:47300",
      DATABASE_URL: "postgres://x",
      BETTER_AUTH_SECRET: "s",
      FILE_URL_SECRET: "f",
      SMTP_LOCAL_URL: "smtp://mailpit:1025",
    };
    const stack = { ...local, LOCAL_STACK: "on" as const };
    expect(environmentIssues({ ...stack, APP_URL: raw.APP_URL }, raw, true)).toEqual([]);
    expect(environmentIssues({ ...stack, APP_URL: "https://a.b" }, raw, true)).toEqual([
      "LOCAL_STACK is for this machine only and needs APP_URL on localhost",
    ]);
  });
});
