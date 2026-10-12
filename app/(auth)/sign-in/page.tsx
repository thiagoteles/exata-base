import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SignInForm } from "@/features/auth/sign-in-form";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/ports/auth";
import { HostedAuthScreen } from "@/lib/ports/auth/screens";
import { safeReturnPath } from "@/lib/routes";
import { firstParam } from "@/lib/search-param";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("title"), robots: { index: false } };
}

function noticeFrom(
  query: Record<string, string | string[] | undefined>,
): "verified" | "reset" | null {
  if (firstParam(query["reset"]) !== undefined) {
    return "reset";
  }
  return firstParam(query["verified"]) === undefined ? null : "verified";
}

type Params = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function SignInPage({ searchParams }: Params) {
  return (
    <Suspense>
      <SignInScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInScreen({ searchParams }: Params) {
  const query = await searchParams;
  const next = safeReturnPath(firstParam(query["next"]));
  if ((await getCurrentUser()) !== null) {
    redirect(next as never);
  }
  if (env.AUTH_PROVIDER === "clerk") {
    return <HostedAuthScreen screen="sign-in" next={next} />;
  }
  return <SignInForm next={next} notice={noticeFrom(query)} />;
}
