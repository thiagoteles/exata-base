import type { ReactNode } from "react";
import { env } from "@/lib/env";

/*
 * What the auth port draws. In local mode the sign-in screens are the app's own forms and the
 * port draws almost nothing; in Clerk mode it draws Clerk's. Each branch loads its SDK only when
 * it is the one in use.
 */

/** Wraps the app in the provider the auth mode needs. Local mode needs none. */
export async function AuthProvider({ children }: { children: ReactNode }) {
  if (env.AUTH_PROVIDER !== "clerk" || env.CLERK_PUBLISHABLE_KEY === undefined) {
    return children;
  }
  const { ClerkAuthProvider } = await import("./adapters/clerk-screens");
  return (
    <ClerkAuthProvider publishableKey={env.CLERK_PUBLISHABLE_KEY}>{children}</ClerkAuthProvider>
  );
}

type HostedScreenProps = {
  screen: "sign-in" | "sign-up";
  next: string;
  email?: string | undefined;
};

/** The provider's own sign-in or sign-up screen, or nothing in local mode, where the app has forms. */
export async function HostedAuthScreen({ screen, next, email }: HostedScreenProps) {
  if (env.AUTH_PROVIDER !== "clerk") {
    return null;
  }
  const { ClerkSignIn, ClerkSignUp } = await import("./adapters/clerk-screens");
  return screen === "sign-in" ? (
    <ClerkSignIn next={next} />
  ) : (
    <ClerkSignUp next={next} email={email} />
  );
}

/** The sign-out button of the current mode. The caller decides how it looks. */
export async function SignOutControl({ className }: { className: string }) {
  if (env.AUTH_PROVIDER === "clerk") {
    const { ClerkSignOut } = await import("./adapters/clerk-screens");
    return <ClerkSignOut className={className} />;
  }
  const { LocalSignOut } = await import("./adapters/local-screens");
  return <LocalSignOut className={className} />;
}
