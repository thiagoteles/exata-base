import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Panel } from "@/components/ui/panel";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { env } from "@/lib/env";
import { firstParam } from "@/lib/search-param";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("title"), robots: { index: false } };
}

type Params = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function ResetPasswordPage({ searchParams }: Params) {
  return (
    <Suspense>
      <ResetScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetScreen({ searchParams }: Params) {
  // The address is read first, so the provider is the one the server runs with, not the one the
  // image was built with.
  const query = await searchParams;
  if (env.AUTH_PROVIDER === "clerk") {
    notFound();
  }
  const t = await getTranslations("auth.reset");
  const token = firstParam(query["token"]);
  if (token === undefined || token === "") {
    return (
      <Panel className="flex w-full max-w-md flex-col gap-4 p-8">
        <p className="text-body text-ink">{t("missing")}</p>
        <Link href="/forgot-password" className="text-body-small text-brand-ink underline">
          {t("request")}
        </Link>
      </Panel>
    );
  }
  return <ResetPasswordForm token={token} />;
}
