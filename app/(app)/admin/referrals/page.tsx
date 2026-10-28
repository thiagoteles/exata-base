import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { catalog } from "@/domain/billing/catalog";
import { ReferralsBoard } from "@/features/admin/referrals-board";
import { readReferralReport } from "@/lib/admin/referrals";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.referrals");
  return { title: t("title"), robots: { index: false } };
}

export default function ReferralsPage() {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <Referrals />
      </Suspense>
    </div>
  );
}

async function Referrals() {
  const t = await getTranslations("admin.referrals");
  const viewer = await requirePageRole("admin", "/admin/referrals");
  await connection();
  const report = await readReferralReport(db, viewer);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <ReferralsBoard report={report} creditOn={catalog.referralCredit.cents > 0} />
    </>
  );
}
