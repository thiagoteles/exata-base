import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { AdminHub } from "@/features/admin/hub";
import { staffDestinations } from "@/lib/navigation";
import { requirePageRole } from "@/lib/page-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.hub");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminHubPage() {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <Hub />
      </Suspense>
    </div>
  );
}

/** Every staff and admin screen the person may open, the product's among them. */
async function Hub() {
  const t = await getTranslations("admin.hub");
  const viewer = await requirePageRole("staff", "/admin");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <AdminHub destinations={staffDestinations(viewer.role)} />
    </>
  );
}
