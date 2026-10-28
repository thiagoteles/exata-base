import type { Role } from "@/lib/accounts/roles";
import type { UserOptions } from "@/lib/db/schema/users";

/** What the app knows about whoever is signed in. Narrow on purpose: it can reach the client. */
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  options: UserOptions;
  /** The picture the sign-in provider holds for the person, when it has one. */
  image: string | null;
};

/** Who the session says is signed in, before the user row is read. */
export type SessionIdentity =
  | { kind: "local"; userId: string }
  | { kind: "clerk"; clerkId: string };

/** What a password sign-in decided. A second factor still has to be typed when `twoFactor` is set. */
export type SignInOutcome = { twoFactor: boolean };

/** Sign-in with e-mail and password. Only the local mode has it; Clerk serves its own screens. */
export type PasswordCredentials = {
  signIn: (input: { email: string; password: string }) => Promise<SignInOutcome>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  requestReset: (input: { email: string }) => Promise<void>;
  resetPassword: (input: { token: string; password: string }) => Promise<void>;
  verifySecondFactor: (input: { code: string; backup: boolean }) => Promise<void>;
  enableSecondFactor: (input: {
    password: string;
  }) => Promise<{ totpUri: string; backupCodes: string[] }>;
  disableSecondFactor: (input: { password: string }) => Promise<void>;
};

/**
 * Who keeps the list of a person's signed-in devices. Local mode keeps it in the app's own table and
 * knows which one is this browser; Clerk keeps it itself, so the app only points to its portal.
 */
type SessionAccess =
  | { kind: "own"; currentId: () => Promise<string | null> }
  | { kind: "external"; url: string | null };

export type AuthAdapter = {
  sessionAccess: SessionAccess;
  credentials?: PasswordCredentials;
  /** Reads the current request's session. Never writes. */
  identity: () => Promise<SessionIdentity | null>;
  /** Makes sure the session has a user row, creating it when the provider knows more than we do. */
  ensureUser: (identity: SessionIdentity) => Promise<void>;
  deleteProviderUser: (clerkId: string) => Promise<void>;
  handleRequest: (request: Request) => Promise<Response>;
};
