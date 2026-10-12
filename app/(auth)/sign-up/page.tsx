import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { currentInstant } from "@/domain/clock";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { findPendingInvite } from "@/lib/accounts/invites";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/ports/auth";
import { HostedAuthScreen } from "@/lib/ports/auth/screens";
import { firstParam } from "@/lib/search-param";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return { title: t("title"), robots: { index: false } };
}

type Params = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function SignUpPage({ searchParams }: Params) {
  return (
    <Suspense>
      <SignUpScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUpScreen({ searchParams }: Params) {
  const query = await searchParams;
  if ((await getCurrentUser()) !== null) {
    redirect("/account");
  }
  // An invite link carries a token. The token only fills in the e-mail it was sent to; the role
  // is applied when that e-mail is confirmed, so a forged token gains nothing.
  const token = firstParam(query["invite"]);
  // Whether an invite has lapsed depends on the clock, which is read at request time only.
  await connection();
  const invite = token === undefined ? null : await findPendingInvite(db, token, currentInstant());
  if (env.AUTH_PROVIDER === "clerk") {
    return <HostedAuthScreen screen="sign-up" next="/account" email={invite?.email} />;
  }
  return <SignUpForm invitedEmail={invite?.email} />;
}
