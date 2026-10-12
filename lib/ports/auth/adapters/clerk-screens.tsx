"use client";

import { ptBR } from "@clerk/localizations";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/*
 * The Clerk side of every screen. Hash routing keeps the sub-steps in the address fragment, so
 * the pages are plain /sign-in and /sign-up and typed links to them keep working.
 * The publishable key arrives as a prop. It is given when the image is built: the provider sits in
 * the root layout, which is prerendered, so a key read at runtime would never reach a static page.
 */

export function ClerkAuthProvider({
  publishableKey,
  children,
}: {
  publishableKey: string;
  children: ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={ptBR}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      {children}
    </ClerkProvider>
  );
}

const afterSignIn = (next: string) => `/auth/complete?next=${encodeURIComponent(next)}`;

export function ClerkSignIn({ next }: { next: string }) {
  return <SignIn routing="hash" signUpUrl="/sign-up" forceRedirectUrl={afterSignIn(next)} />;
}

export function ClerkSignUp({ next, email }: { next: string; email?: string | undefined }) {
  return (
    <SignUp
      routing="hash"
      signInUrl="/sign-in"
      forceRedirectUrl={afterSignIn(next)}
      {...(email === undefined ? {} : { initialValues: { emailAddress: email } })}
    />
  );
}

export function ClerkSignOut({ className }: { className: string }) {
  const t = useTranslations("auth");
  const { signOut } = useClerk();
  return (
    <button type="button" className={className} onClick={() => signOut({ redirectUrl: "/" })}>
      {t("signOut")}
    </button>
  );
}
