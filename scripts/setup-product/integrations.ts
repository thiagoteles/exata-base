import {
  digits,
  email,
  emailList,
  nonEmpty,
  onOff,
  proxy,
  serviceAccount,
  startsWith,
  url,
  uuid,
} from "./field-checks";

const ENV_LINE = /^([A-Z][A-Z0-9_]*)=(.*)$/;

/*
 * The outside services a product can turn on, and what each one needs. The rules mirror the ones
 * the environment module enforces at boot (prefixes, groups that must be filled together), so a
 * wrong key is caught while the person is still answering, not when production refuses to start.
 */

export type Values = Partial<Record<string, string>>;

type Field = {
  name: string;
  label: string;
  /** Returns a complaint, or null when the value is acceptable. */
  check: (value: string) => string | null;
  /** May stay empty: the service works without it, or it is only known after the first deploy. */
  optional?: boolean;
};

export type Integration = {
  id: string;
  question: string;
  note?: string;
  fields: readonly Field[];
  /** At least one of these fields must be filled (a service sold in several variants). */
  oneOf?: readonly string[];
};

export const integrations: readonly Integration[] = [
  {
    id: "clerk",
    question: "Sign-in through Clerk (otherwise the app signs people in itself)",
    note: "Use keys from the production instance. The webhook secret appears after you add the webhook, so it may stay empty for now.",
    fields: [
      { name: "CLERK_PUBLISHABLE_KEY", label: "Clerk publishable key", check: startsWith("pk_") },
      { name: "CLERK_SECRET_KEY", label: "Clerk secret key", check: startsWith("sk_") },
      {
        name: "CLERK_WEBHOOK_SECRET",
        label: "Clerk webhook secret",
        check: startsWith("whsec_"),
        optional: true,
      },
    ],
  },
  {
    id: "google",
    question: "Google sign-in (only when the app signs people in itself)",
    fields: [
      { name: "GOOGLE_CLIENT_ID", label: "Google client id", check: nonEmpty },
      { name: "GOOGLE_CLIENT_SECRET", label: "Google client secret", check: nonEmpty },
    ],
  },
  {
    id: "stripe",
    question: "Payments through Stripe",
    note: "Create one price in Stripe for each plan you sell, and fill only those.",
    fields: [
      { name: "STRIPE_SECRET_KEY", label: "Stripe secret key", check: startsWith("sk_") },
      {
        name: "STRIPE_WEBHOOK_SECRET",
        label: "Stripe webhook secret",
        check: startsWith("whsec_"),
      },
      {
        name: "STRIPE_PRICE_MONTHLY",
        label: "Monthly price id",
        check: startsWith("price_"),
        optional: true,
      },
      {
        name: "STRIPE_PRICE_YEARLY",
        label: "Yearly price id",
        check: startsWith("price_"),
        optional: true,
      },
      {
        name: "STRIPE_PRICE_LIFETIME",
        label: "Lifetime price id",
        check: startsWith("price_"),
        optional: true,
      },
    ],
    oneOf: ["STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_YEARLY", "STRIPE_PRICE_LIFETIME"],
  },
  {
    id: "email",
    question: "E-mail sending through Mailtrap",
    fields: [
      { name: "MAILTRAP_TOKEN", label: "Mailtrap API token", check: nonEmpty },
      { name: "MAILTRAP_INBOX", label: "Mailtrap inbox id (digits)", check: digits },
      { name: "EMAIL_FROM", label: "Sender address", check: email },
    ],
  },
  {
    id: "storage",
    question: "Files and logs on Google Cloud",
    note: "A private bucket with uniform access, and a service account that can write to it.",
    fields: [
      {
        name: "GCP_CREDENTIALS",
        label: "Service account JSON, in base64",
        check: serviceAccount,
      },
      { name: "GCP_PROJECT", label: "Google Cloud project id", check: nonEmpty },
      { name: "GCS_BUCKET", label: "Bucket name", check: nonEmpty },
    ],
  },
  {
    id: "analytics",
    question: "Analytics through Umami",
    fields: [
      { name: "UMAMI_WEBSITE_ID", label: "Umami website id", check: uuid },
      { name: "UMAMI_SCRIPT_URL", label: "Umami script address", check: url },
    ],
  },
  {
    id: "search-console",
    question: "Google Search Console, verified by meta tag",
    fields: [
      {
        name: "GOOGLE_SITE_VERIFICATION",
        label: "Verification token (the content of the meta tag)",
        check: nonEmpty,
      },
    ],
  },
];

/** Asked of every product, whichever services it turns on. */
export const basics: readonly Field[] = [
  { name: "APP_URL", label: "Public address of the product", check: url },
  {
    name: "ADMIN_EMAILS",
    label: "Admin e-mails, comma separated",
    check: emailList,
    optional: true,
  },
  {
    name: "CONTACT_EMAIL",
    label: "E-mails told about new contact messages, comma separated",
    check: emailList,
    optional: true,
  },
  {
    name: "ACCESS_LOG",
    label: "Run for profit? Keep the Marco Civil access records (on or off)",
    check: onOff,
    optional: true,
  },
  {
    name: "TRUSTED_PROXY",
    label: "Proxy in front of the app: traefik (Coolify alone) or cloudflare",
    check: proxy,
    optional: true,
  },
];

const fieldByName = new Map(
  [...integrations.flatMap((item) => item.fields), ...basics].map((field) => [field.name, field]),
);

/** The complaint about one answer, or null when it is acceptable. */
export function checkField(name: string, value: string): string | null {
  return fieldByName.get(name)?.check(value.trim()) ?? null;
}

const knownNames = [...fieldByName.keys(), "AUTH_PROVIDER"];

const filled = (values: Values, name: string) => (values[name] ?? "").trim().length > 0;

const authProviders: readonly string[] = ["clerk", "local"];

function nameProblems(values: Values): string[] {
  const problems = Object.keys(values)
    .filter((name) => !knownNames.includes(name))
    .map((name) => `${name} is not a variable this script knows`);
  const provider = values["AUTH_PROVIDER"];
  if (provider !== undefined && !authProviders.includes(provider)) {
    problems.push("AUTH_PROVIDER must be clerk or local");
  }
  return problems;
}

function shapeProblems(values: Values): string[] {
  return [...fieldByName.keys()]
    .filter((name) => filled(values, name))
    .flatMap((name) => {
      const complaint = checkField(name, values[name] ?? "");
      return complaint === null ? [] : [`${name} ${complaint}`];
    });
}

function groupProblems(values: Values): string[] {
  return integrations.flatMap((integration) => {
    const present = integration.fields.filter((field) => filled(values, field.name));
    if (present.length === 0) {
      return [];
    }
    const missing = integration.fields
      .filter((field) => field.optional !== true && !filled(values, field.name))
      .map(
        (field) => `${field.name} is needed together with ${present.map((p) => p.name).join(", ")}`,
      );
    const { oneOf } = integration;
    const lacksOne = oneOf !== undefined && !oneOf.some((name) => filled(values, name));
    return lacksOne
      ? [...missing, `${integration.id}: fill at least one of ${oneOf.join(", ")}`]
      : missing;
  });
}

function providerProblems(values: Values): string[] {
  const problems: string[] = [];
  if (filled(values, "GOOGLE_CLIENT_ID") && values["AUTH_PROVIDER"] === "clerk") {
    problems.push(
      "Google sign-in applies only when the app signs people in itself, not with Clerk",
    );
  }
  if (filled(values, "CLERK_SECRET_KEY") && values["AUTH_PROVIDER"] === "local") {
    problems.push("Clerk keys were given but AUTH_PROVIDER is local");
  }
  return problems;
}

/** What is wrong with the values given, one line each. Empty means they can be written. */
export function validateIntegrations(values: Values): string[] {
  return [
    ...nameProblems(values),
    ...shapeProblems(values),
    ...groupProblems(values),
    ...providerProblems(values),
  ];
}

/**
 * Adds the secrets the app needs and the person should not have to invent: the sign-in secret when
 * the app signs people in itself, the daily-call secret, and the file-link secret when files stay
 * on disk. A value already there is kept.
 */
export function withGeneratedSecrets(values: Values, random: () => string): Values {
  const next = { ...values };
  const fill = (name: string) => {
    if (!filled(next, name)) {
      next[name] = random();
    }
  };
  fill("CRON_SECRET");
  fill("UNSUBSCRIBE_SECRET");
  if (next["AUTH_PROVIDER"] === "local") {
    fill("BETTER_AUTH_SECRET");
  }
  if (!filled(next, "GCS_BUCKET")) {
    fill("FILE_URL_SECRET");
  }
  return next;
}

const order = [
  "APP_URL",
  "AUTH_PROVIDER",
  "BETTER_AUTH_SECRET",
  ...integrations.flatMap((item) => item.fields.map((field) => field.name)),
  "ADMIN_EMAILS",
  "CONTACT_EMAIL",
  "TRUSTED_PROXY",
  "ACCESS_LOG",
  "CRON_SECRET",
  "UNSUBSCRIBE_SECRET",
  "FILE_URL_SECRET",
];

export function parseEnvFile(text: string): Values {
  const values: Values = {};
  for (const line of text.split("\n")) {
    const match = ENV_LINE.exec(line.trim());
    if (match?.[1] !== undefined && match[2] !== undefined && match[2] !== "") {
      values[match[1]] = match[2];
    }
  }
  return values;
}

export function renderEnvFile(values: Values): string {
  const lines = order
    .filter((name) => filled(values, name))
    .map((name) => `${name}=${(values[name] ?? "").trim()}`);
  return `${lines.join("\n")}\n`;
}
