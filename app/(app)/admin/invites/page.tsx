import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { InviteForm } from "@/features/admin/invite-form";
import { InvitesList } from "@/features/admin/invites-list";
import { requirePageRole } from "@/lib/page-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.invites");
  return { title: t("title"), robots: { index: false } };
}

type Props = { searchParams: Promise<SearchParams> };

export default function InvitesPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <Invites searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Invites({ searchParams }: Props) {
  const t = await getTranslations("admin.invites");
  const user = await requirePageRole("admin", "/admin/invites");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <InviteForm />
      <InvitesList viewer={user} searchParams={searchParams} />
    </>
  );
}
