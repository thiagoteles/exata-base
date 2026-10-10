import { describe, expect, it } from "vitest";
import {
  parseEnvFile,
  renderEnvFile,
  validateIntegrations,
  withGeneratedSecrets,
} from "./integrations";

const stripe = {
  STRIPE_SECRET_KEY: "sk_test_abc",
  STRIPE_WEBHOOK_SECRET: "whsec_abc",
};

describe("validating the integrations", () => {
  it("accepts nothing at all", () => {
    expect(validateIntegrations({})).toEqual([]);
  });

  it("accepts a complete Stripe group, which asks for no price: prices are found by lookup key", () => {
    expect(validateIntegrations(stripe)).toEqual([]);
  });

  it("names the key with the wrong prefix", () => {
    const problems = validateIntegrations({ ...stripe, STRIPE_SECRET_KEY: "pk_test_abc" });
    expect(problems).toEqual(["STRIPE_SECRET_KEY must start with sk_"]);
  });

  it("asks for the rest of a half filled group", () => {
    const problems = validateIntegrations({ STRIPE_SECRET_KEY: "sk_test_abc" });
    expect(problems).toContain("STRIPE_WEBHOOK_SECRET is needed together with STRIPE_SECRET_KEY");
  });

  it("lets the Clerk webhook secret wait for the first deploy", () => {
    const problems = validateIntegrations({
      AUTH_PROVIDER: "clerk",
      CLERK_PUBLISHABLE_KEY: "pk_live_1",
      CLERK_SECRET_KEY: "sk_live_1",
    });
    expect(problems).toEqual([]);
  });

  it("refuses Google sign-in with Clerk and Clerk keys with local sign-in", () => {
    expect(
      validateIntegrations({
        AUTH_PROVIDER: "clerk",
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      }),
    ).toHaveLength(1);
    expect(
      validateIntegrations({
        AUTH_PROVIDER: "local",
        CLERK_PUBLISHABLE_KEY: "pk_test_1",
        CLERK_SECRET_KEY: "sk_test_1",
      }),
    ).toHaveLength(1);
  });

  it("checks the shape of e-mails, ids and the service account", () => {
    const problems = validateIntegrations({
      ADMIN_EMAILS: "ok@example.com, nope",
      UMAMI_WEBSITE_ID: "not-a-uuid",
      UMAMI_SCRIPT_URL: "https://stats.example.com/script.js",
      MAILTRAP_TOKEN: "t",
      MAILTRAP_INBOX: "12a",
      EMAIL_FROM: "no-reply@example.com",
    });
    expect(problems).toHaveLength(3);
    expect(problems).toEqual(
      expect.arrayContaining([
        "MAILTRAP_INBOX must be only digits",
        "UMAMI_WEBSITE_ID must be a UUID",
        "ADMIN_EMAILS must be a comma list of e-mail addresses",
      ]),
    );
  });

  it("accepts a service account encoded in base64 and refuses anything else", () => {
    const good = Buffer.from(JSON.stringify({ type: "service_account" })).toString("base64");
    const group = { GCP_PROJECT: "p", GCS_BUCKET: "b" };
    expect(validateIntegrations({ ...group, GCP_CREDENTIALS: good })).toEqual([]);
    expect(validateIntegrations({ ...group, GCP_CREDENTIALS: "plain text" })).toHaveLength(1);
  });

  it("refuses a variable it does not know", () => {
    expect(validateIntegrations({ STRIPE_SECRET: "x" })).toEqual([
      "STRIPE_SECRET is not a variable this script knows",
    ]);
  });
});

describe("generated secrets", () => {
  it("adds the scheduled-call, unsubscribe, document-address and file-link secrets, and the sign-in secret only for local sign-in", () => {
    const next = withGeneratedSecrets({ AUTH_PROVIDER: "local" }, () => "x".repeat(32));
    expect(Object.keys(next).sort((a, b) => a.localeCompare(b))).toEqual([
      "AUTH_PROVIDER",
      "BETTER_AUTH_SECRET",
      "CRON_SECRET",
      "DOCUMENT_SECRET",
      "FILE_URL_SECRET",
      "UNSUBSCRIBE_SECRET",
    ]);
    expect(Object.keys(withGeneratedSecrets({ AUTH_PROVIDER: "clerk" }, () => "x"))).not.toContain(
      "BETTER_AUTH_SECRET",
    );
  });

  it("skips the file-link secret with a bucket, and keeps what is already there", () => {
    const next = withGeneratedSecrets({ GCS_BUCKET: "b", CRON_SECRET: "kept" }, () => "new");
    expect(next["FILE_URL_SECRET"]).toBeUndefined();
    expect(next["CRON_SECRET"]).toBe("kept");
  });
});

describe("the file", () => {
  it("writes a stable order, skips blanks, and reads back what it wrote", () => {
    const text = renderEnvFile({ ...stripe, APP_URL: "https://example.com", ADMIN_EMAILS: " " });
    expect(text).toBe(
      "APP_URL=https://example.com\nSTRIPE_SECRET_KEY=sk_test_abc\nSTRIPE_WEBHOOK_SECRET=whsec_abc\n",
    );
    expect(parseEnvFile(text)).toMatchObject(stripe);
  });
});
