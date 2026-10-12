import type { ReactNode } from "react";

/*
 * The provider the root layout wraps the app in. It lives apart from the sign-in screens because
 * the root layout reaches every page, and the screens' modules would come along.
 */

/**
 * Wraps the app in the provider the auth mode needs; local mode needs none. The root layout is
 * prerendered, so this follows the key the image was built with, and the server refuses to start
 * when AUTH_PROVIDER says otherwise.
 */
export async function AuthProvider({ children }: { children: ReactNode }) {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { ClerkAuthProvider } = await import("./adapters/clerk-screens");
    return (
      <ClerkAuthProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
        {children}
      </ClerkAuthProvider>
    );
  }
  return children;
}
