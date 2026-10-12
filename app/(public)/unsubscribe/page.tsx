import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Panel } from "@/components/ui/panel";
import { UnsubscribeForm } from "@/features/unsubscribe/unsubscribe-form";
import { env } from "@/lib/env";
import { readUnsubscribe } from "@/lib/unsubscribe/token";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("unsubscribe");
  // A page reached from a message, for one person: nothing for a search engine to keep.
  return { title: t("title"), robots: { index: false, follow: false } };
}

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const t = await getTranslations("unsubscribe");
  return (
    <div className="mx-auto w-full max-w-180 px-4 py-12 md:py-18">
      <h1 className="text-page-title text-ink">{t("title")}</h1>
      <div className="mt-8">
        <Suspense>
          <Confirmation searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

/** Reads the link, so it streams in. A link that is not ours gets a plain refusal and the way to the account. */
async function Confirmation({ searchParams }: Props) {
  const [t, query] = await Promise.all([getTranslations("unsubscribe"), searchParams]);
  const token = typeof query.token === "string" ? query.token : "";
  const statement = readUnsubscribe(env.UNSUBSCRIBE_SECRET, token);
  if (statement === null) {
    return (
      <Panel role="alert" className="flex flex-col gap-3">
        <p className="text-body text-ink">{t("invalid")}</p>
        <Link href="/account" className="text-body text-ink underline">
          {t("toAccount")}
        </Link>
      </Panel>
    );
  }
  return (
    <UnsubscribeForm token={token} address={statement.address} category={statement.category} />
  );
}
