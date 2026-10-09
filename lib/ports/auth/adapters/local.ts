import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { hashPassword } from "better-auth/crypto";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { currentInstant } from "@/domain/clock";
import { applyConfirmedEmail } from "@/lib/accounts/confirmation";
import type { Database } from "@/lib/db/database";
import { accounts, sessions, verifications } from "@/lib/db/schema/auth";
import { users } from "@/lib/db/schema/users";
import { DomainError } from "@/lib/errors";
import type { AuthAdapter, PasswordCredentials } from "../types";

/*
 * Local mode: users live in Postgres and better-auth runs on the app's own tables. Sign-up is
 * open, the e-mail must be confirmed before signing in, and the promotion from ADMIN_EMAILS or a
 * pending invite runs on confirmation. Google turns on when its key pair is set.
 */

type AccountEmail = { to: string; name: string; url: string };

export type LocalAuthOptions = {
  db: Database;
  appUrl: string;
  secret: string;
  adminEmails: readonly string[];
  google?: { clientId: string; clientSecret: string } | undefined;
  sendVerificationEmail: (email: AccountEmail) => Promise<void>;
  sendResetPasswordEmail: (email: AccountEmail) => Promise<void>;
  /** The account is confirmed and usable: the moment a sign-up counts. */
  onSignedUp: (userId: string) => void;
};

export function createLocalAuth(options: LocalAuthOptions) {
  const { db, adminEmails } = options;
  return betterAuth({
    baseURL: options.appUrl,
    secret: options.secret,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    advanced: { database: { generateId: "uuid" } },
    // The local mode is a fallback, not a second product to harden: there is no attempt limit.
    rateLimit: { enabled: false },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: ({ user, url }) =>
        options.sendResetPasswordEmail({ to: user.email, name: user.name, url }),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) =>
        options.sendVerificationEmail({ to: user.email, name: user.name, url }),
      afterEmailVerification: async (user) => {
        await applyConfirmedEmail(db, user.id, adminEmails, currentInstant());
        options.onSignedUp(user.id);
      },
    },
    ...(options.google === undefined ? {} : { socialProviders: { google: options.google } }),
    databaseHooks: {
      user: {
        create: {
          // A provider such as Google delivers a verified e-mail, so confirmation is immediate.
          after: async (user) => {
            if (user.emailVerified) {
              await applyConfirmedEmail(db, user.id, adminEmails, currentInstant());
              options.onSignedUp(user.id);
            }
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

export type LocalAuth = ReturnType<typeof createLocalAuth>;

type ErrorCode = ConstructorParameters<typeof DomainError>[1];

const errorCodes: Readonly<Record<string, { status: 400 | 401 | 403 | 409; key: ErrorCode }>> = {
  INVALID_EMAIL_OR_PASSWORD: { status: 401, key: "invalidCredentials" },
  EMAIL_NOT_VERIFIED: { status: 403, key: "emailNotVerified" },
  USER_ALREADY_EXISTS: { status: 409, key: "emailTaken" },
  INVALID_TOKEN: { status: 400, key: "invalidResetToken" },
};

function toDomainError(error: unknown): DomainError | null {
  const code =
    error instanceof APIError ? (error.body as { code?: string } | undefined)?.code : undefined;
  const known = code === undefined ? undefined : errorCodes[code];
  return known === undefined ? null : new DomainError(known.status, known.key, { cause: error });
}

/** better-auth's errors become the app's domain errors; anything else is left alone to be a 500. */
async function translated<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const domain = toDomainError(error);
    if (domain !== null) {
      throw domain;
    }
    throw error;
  }
}

const AFTER_CONFIRMATION = `/auth/complete?next=${encodeURIComponent("/account")}`;

function passwordCredentials(auth: LocalAuth): PasswordCredentials {
  return {
    signIn: ({ email, password }) =>
      translated(async () => {
        await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
      }),
    signUp: ({ name, email, password }) =>
      translated(async () => {
        await auth.api.signUpEmail({
          body: { name, email, password, callbackURL: AFTER_CONFIRMATION },
          headers: await headers(),
        });
      }),
    requestReset: ({ email }) =>
      translated(async () => {
        await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reset-password" } });
      }),
    resetPassword: ({ token, password }) =>
      translated(async () => {
        await auth.api.resetPassword({ body: { newPassword: password, token } });
      }),
  };
}

export function localAdapter(auth: LocalAuth): AuthAdapter {
  const handler = toNextJsHandler(auth);
  return {
    credentials: passwordCredentials(auth),
    async identity() {
      const session = await auth.api.getSession({ headers: await headers() });
      return session === null ? null : { kind: "local", userId: session.user.id };
    },
    // better-auth writes the row at sign-up, so a valid session always has one.
    ensureUser: () => Promise.resolve(),
    deleteProviderUser: () => Promise.resolve(),
    handleRequest: (request) =>
      request.method === "GET" ? handler.GET(request) : handler.POST(request),
  };
}

/** Gives a seeded user a known password, once. Development only: production has no seed. */
export async function setPasswordIfMissing(
  db: Database,
  userId: string,
  password: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")));
  if (existing !== undefined) {
    return;
  }
  await db.insert(accounts).values({
    userId,
    accountId: userId,
    providerId: "credential",
    password: await hashPassword(password),
  });
}
