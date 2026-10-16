import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { currentInstant } from "@/domain/clock";
import { AuditList } from "@/features/admin/audit-list";
import { dateInSaoPaulo } from "@/lib/date";
import { requirePageRole } from "@/lib/page-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.audit");
  return { title: t("title"), robots: { index: false } };
}

type Props = { searchParams: Promise<SearchParams> };

export default function AuditPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <Audit searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Audit({ searchParams }: Props) {
  const t = await getTranslations("admin.audit");
  const user = await requirePageRole("admin", "/admin/audit");
  // Admin screens keep the product's zone, so everyone reads the same day.
  await connection();
  const today = dateInSaoPaulo(currentInstant());
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <AuditList viewer={user} searchParams={searchParams} today={today} />
    </>
  );
}
