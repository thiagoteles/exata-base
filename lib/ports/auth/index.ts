import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import type { ReactElement } from "react";
import { currentInstant } from "@/domain/clock";
import { upsertClerkUser } from "@/lib/accounts/clerk-sync";
import { savedLocaleOfEmail } from "@/lib/accounts/options";
import { hasRole, type Role } from "@/lib/accounts/roles";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { sendEmail } from "@/lib/ports/email";
import { chooseLocale, requestLocale } from "@/lib/ports/email/locale";
import { type EmailTranslator, emailTranslatorFor, renderEmail } from "@/lib/ports/email/render";
import type { AuthAdapter, CurrentUser, SessionIdentity } from "./types";

/*
 * The auth port. Pages, actions and routes see only this module: who is signed in, the role
 * guards, and the auth API. AUTH_PROVIDER picks the adapter at startup and each SDK is loaded by
 * dynamic import, so the other one is never evaluated.
 */

type AccountMessage = { subject: string; element: ReactElement };

/** Sends an account e-mail in the recipient's saved language, else the one they are using now. */
async function sendAccountEmail(to: string, build: (t: EmailTranslator) => AccountMessage) {
  const locale = chooseLocale(await savedLocaleOfEmail(db, to), await requestLocale());
  const message = build(await emailTranslatorFor(locale));
  const { html, text } = await renderEmail(message.element);
  if (!(await sendEmail({ to, subject: message.subject, html, text }))) {
    // Surfacing the failure lets the sign-up screen tell the person the e-mail did not go out.
    throw new Error("account e-mail not sent");
  }
}

async function loadAdapter(): Promise<AuthAdapter> {
  if (env.AUTH_PROVIDER === "clerk") {
    const { clerkAdapter } = await import("./adapters/clerk");
    return clerkAdapter((profile) =>
      upsertClerkUser(db, profile, env.ADMIN_EMAILS, currentInstant()),
    );
  }
  const [{ localAdapter }, auth] = await Promise.all([import("./adapters/local"), localAuth()]);
  return localAdapter(auth);
}

let localAuthInstance: ReturnType<typeof createLocal> | undefined;

async function createLocal() {
  const [{ createLocalAuth }, { verifyEmailMessage, resetPasswordMessage }] = await Promise.all([
    import("./adapters/local"),
    import("@/emails/account-emails"),
  ]);
  return createLocalAuth({
    db,
    appUrl: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    adminEmails: env.ADMIN_EMAILS,
    google:
      env.GOOGLE_CLIENT_ID === undefined || env.GOOGLE_CLIENT_SECRET === undefined
        ? undefined
        : { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    sendVerificationEmail: ({ to, name, url }) =>
      sendAccountEmail(to, (t) => verifyEmailMessage({ name, url }, t)),
    sendResetPasswordEmail: ({ to, name, url }) =>
      sendAccountEmail(to, (t) => resetPasswordMessage({ name, url }, t)),
  });
}

function localAuth() {
  localAuthInstance ??= createLocal();
  return localAuthInstance;
}

let adapter: Promise<AuthAdapter> | undefined;

function authAdapter(): Promise<AuthAdapter> {
  adapter ??= loadAdapter();
  return adapter;
}

async function readUser(identity: SessionIdentity): Promise<CurrentUser | null> {
  const where =
    identity.kind === "local" ? eq(users.id, identity.userId) : eq(users.clerkId, identity.clerkId);
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      options: users.options,
    })
    .from(users)
    .where(where);
  return user ?? null;
}

/**
 * Who is signed in, or null. Cached per browser for the session; it only reads, so a Clerk
 * sign-in that arrives before the webhook returns null here until `requireUser` stores the row.
 * Read it only inside a <Suspense> boundary.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  "use cache: private";
  const identity = await (await authAdapter()).identity();
  return identity === null ? null : readUser(identity);
}

/**
 * Who is signed in right now, read fresh and never cached. Actions and routes use it where a
 * visitor is allowed but a signed-in person is recognized, like the public contact form.
 */
export async function readCurrentUser(): Promise<CurrentUser | null> {
  const identity = await (await authAdapter()).identity();
  return identity === null ? null : readUser(identity);
}

/** The signed-in user, or a 401. Creates the Clerk row when the sign-in beat the webhook. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user !== null) {
    return user;
  }
  const current = await authAdapter();
  const identity = await current.identity();
  if (identity !== null) {
    await current.ensureUser(identity);
    const created = await readUser(identity);
    if (created !== null) {
      return created;
    }
  }
  throw new DomainError(401);
}

/** The signed-in user when their role is at least `minimum`; otherwise a 401 or a 403. */
export async function requireRole(minimum: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user.role, minimum)) {
    throw new DomainError(403);
  }
  return user;
}

async function passwordCredentials() {
  const { credentials } = await authAdapter();
  if (credentials === undefined) {
    // Clerk serves its own sign-in screens, so the password actions have nothing to do here.
    throw new DomainError(400);
  }
  return credentials;
}

export const signInWithPassword = async (input: { email: string; password: string }) =>
  (await passwordCredentials()).signIn(input);
export const signUpWithPassword = async (input: {
  name: string;
  email: string;
  password: string;
}) => (await passwordCredentials()).signUp(input);
export const requestPasswordReset = async (input: { email: string }) =>
  (await passwordCredentials()).requestReset(input);
export const resetPassword = async (input: { token: string; password: string }) =>
  (await passwordCredentials()).resetPassword(input);

/** The auth API under /api/auth. Exists only in local mode; Clerk answers 404. */
export async function handleAuthRequest(request: Request): Promise<Response> {
  return (await authAdapter()).handleRequest(request);
}

export async function deleteProviderUser(clerkId: string): Promise<void> {
  await (await authAdapter()).deleteProviderUser(clerkId);
}

/** Verifies and reads a Clerk webhook. Null in local mode, where the route refuses the request. */
export async function readClerkWebhookRequest(request: NextRequest) {
  if (env.AUTH_PROVIDER !== "clerk" || env.CLERK_WEBHOOK_SECRET === undefined) {
    return null;
  }
  const { readClerkWebhook } = await import("./adapters/clerk");
  return readClerkWebhook(request, env.CLERK_WEBHOOK_SECRET);
}

/** Gives the seeded admin its known password in local mode. Development only. */
export async function seedLocalPassword(userId: string, password: string): Promise<void> {
  if (env.AUTH_PROVIDER !== "local") {
    return;
  }
  const { setPasswordIfMissing } = await import("./adapters/local");
  await setPasswordIfMissing(db, userId, password);
}
