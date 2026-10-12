/*
 * What the auth port draws. In local mode the sign-in screens are the app's own forms and the
 * port draws almost nothing; in Clerk mode it draws Clerk's. Whether there is a Clerk side at all
 * is decided when the image is built: each branch tests the publishable key written out in full,
 * which the bundler replaces with the build's value, so a local build drops the Clerk branch and
 * never compiles Clerk's components or server actions into a page. Read through `env`, the branch
 * would stay, and every route would carry Clerk.
 */

type HostedScreenProps = {
  screen: "sign-in" | "sign-up";
  next: string;
  email?: string | undefined;
};

/** The provider's own sign-in or sign-up screen, or nothing in local mode, where the app has forms. */
export async function HostedAuthScreen({ screen, next, email }: HostedScreenProps) {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { ClerkSignIn, ClerkSignUp } = await import("./adapters/clerk-screens");
    return screen === "sign-in" ? (
      <ClerkSignIn next={next} />
    ) : (
      <ClerkSignUp next={next} email={email} />
    );
  }
  return null;
}

/** The sign-out button of the current mode. The caller decides how it looks. */
export async function SignOutControl({ className }: { className: string }) {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { ClerkSignOut } = await import("./adapters/clerk-screens");
    return <ClerkSignOut className={className} />;
  }
  const { LocalSignOut } = await import("./adapters/local-screens");
  return <LocalSignOut className={className} />;
}
