import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { receiptNumber } from "@/domain/documents/receipt";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { receiptFacts } from "@/lib/documents/receipts";
import { readDocument } from "@/lib/documents/slug";
import { env } from "@/lib/env";
import { formatPrice, toCents } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("verify");
  // Reached from a printed code, for one document: nothing for a search engine to keep.
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function VerifyPage({ params }: PageProps<"/verify/[slug]">) {
  return (
    <div className="mx-auto w-full max-w-180 px-4 py-12 md:py-18">
      <Suspense>
        <Verification params={params} />
      </Suspense>
    </div>
  );
}

/** Reads the address, so it streams in. What it shows is the record as it is now, never a copy made at printing. */
async function Verification({ params }: { params: PageProps<"/verify/[slug]">["params"] }) {
  const [t, { slug }] = await Promise.all([getTranslations("verify"), params]);
  const document = readDocument(env.DOCUMENT_SECRET, slug);
  const facts = document === null ? null : await receiptFacts(db, document.id);
  if (facts === null) {
    notFound();
  }
  const settled = facts.status === "paid";
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-page-title text-ink">{t("title")}</h1>
      <Panel tone={settled ? "info" : "neutral"} role="status" className="flex flex-col gap-2">
        <Stamp tone={settled ? "success" : "warning"} className="self-start">
          {t(`states.${facts.status}`)}
        </Stamp>
        <p className="text-block-title text-ink">{t(`outcome.${settled ? "valid" : "changed"}`)}</p>
        <p className="max-w-[56ch] text-body-small text-ink-muted">
          {t(`outcomeHelp.${settled ? "valid" : "changed"}`)}
        </p>
      </Panel>
      <RecordGrid>
        <RecordCell label={t("kind")}>{t("kinds.receipt")}</RecordCell>
        <RecordCell label={t("number")}>
          <span className="font-mono text-data">{receiptNumber(facts.id)}</span>
        </RecordCell>
        <RecordCell label={t("amount")}>
          {formatPrice(toCents(facts.amountCents), facts.currency)}
        </RecordCell>
        <RecordCell label={t("date")}>
          <span className="font-mono text-data tabular-nums">
            {formatInstantDate(facts.paidAt)}
          </span>
        </RecordCell>
      </RecordGrid>
    </div>
  );
}
