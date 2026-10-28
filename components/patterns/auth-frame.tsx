import type { ReactNode } from "react";

/** What a product's frame around the sign-in and sign-up screens receives. */
export type AuthLayoutProps = { children: ReactNode };

/** What a product's own sign-in or sign-up screen receives in Clerk mode. */
export type AuthScreenProps = {
  screen: "sign-in" | "sign-up";
  /** Where to go once signed in: a path inside the app, already checked. */
  next: string;
  /** The address an invitation was sent to, which the sign-up starts from. */
  email?: string | undefined;
};
