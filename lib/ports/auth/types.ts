import type { Role } from "@/lib/accounts/roles";
import type { UserOptions } from "@/lib/db/schema/users";

/** What the app knows about whoever is signed in. Narrow on purpose: it can reach the client. */
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  options: UserOptions;
};

/** Who the session says is signed in, before the user row is read. */
export type SessionIdentity =
  | { kind: "local"; userId: string }
  | { kind: "clerk"; clerkId: string };

/** Sign-in with e-mail and password. Only the local mode has it; Clerk serves its own screens. */
export type PasswordCredentials = {
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  requestReset: (input: { email: string }) => Promise<void>;
  resetPassword: (input: { token: string; password: string }) => Promise<void>;
};

export type AuthAdapter = {
  credentials?: PasswordCredentials;
  /** Reads the current request's session. Never writes. */
  identity: () => Promise<SessionIdentity | null>;
  /** Makes sure the session has a user row, creating it when the provider knows more than we do. */
  ensureUser: (identity: SessionIdentity) => Promise<void>;
  deleteProviderUser: (clerkId: string) => Promise<void>;
  handleRequest: (request: Request) => Promise<Response>;
};
