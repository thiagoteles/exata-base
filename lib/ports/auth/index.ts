import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { cache } from "react";
import { hasRole, type Role } from "@/lib/accounts/roles";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import type { AuthAdapter, CurrentUser, SessionIdentity } from "./types";

/*
 * The auth port. Pages, actions and routes see only this module: who is signed in, the role
 * guards, and the auth API. AUTH_PROVIDER picks the adapter at startup and each SDK is loaded by
 * dynamic import, so the other one is never evaluated. What an account change sets off (the
 * account e-mails, the sign-up event, the Clerk row) is loaded with the adapter too: a module
 * imported here is compiled into every page that asks who is signed in.
 */

async function loadAdapter(): Promise<AuthAdapter> {
  if (env.AUTH_PROVIDER === "clerk") {
    const [{ clerkAdapter }, { storeClerkUser }] = await Promise.all([
      import("./adapters/clerk"),
      import("./account-hooks"),
    ]);
    return clerkAdapter(storeClerkUser, env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  }
  const [{ localAdapter }, auth] = await Promise.all([import("./adapters/local"), localAuth()]);
  return localAdapter(auth);
}

let localAuthInstance: ReturnType<typeof createLocal> | undefined;

async function createLocal() {
  const [
    { createLocalAuth },
    { verifyEmailMessage, resetPasswordMessage },
    { sendAccountEmail, signedUp },
  ] = await Promise.all([
    import("./adapters/local"),
    import("@/emails/account-emails"),
    import("./account-hooks"),
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
    onSignedUp: signedUp,
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

async function privateCurrentUser(): Promise<CurrentUser | null> {
  "use cache: private";
  const identity = await (await authAdapter()).identity();
  return identity === null ? null : readUser(identity);
}

/**
 * Who is signed in, or null. In production it is cached per browser for the session, so the
 * signed-in shell travels in the prefetched App Shell. The development server keeps every private
 * entry and regenerates it on each read, and what each regeneration holds is never let go (about
 * 1 MB a request, flat without the directive, Next 16.4): there it is read once per request
 * instead. It only reads, so a Clerk sign-in that arrives before the webhook returns null here
 * until `requireUser` stores the row. Read it only inside a <Suspense> boundary.
 */
export const getCurrentUser: () => Promise<CurrentUser | null> =
  env.NODE_ENV === "production" ? privateCurrentUser : cache(readCurrentUser);

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

/** Who keeps the person's list of devices, and which one is this browser (local mode only). */
export async function sessionAccess(): Promise<
  { kind: "own"; currentId: string | null } | { kind: "external"; url: string | null }
> {
  const access = (await authAdapter()).sessionAccess;
  return access.kind === "own" ? { kind: "own", currentId: await access.currentId() } : access;
}

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
