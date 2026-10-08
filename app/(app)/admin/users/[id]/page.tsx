import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { UserRecord } from "@/features/admin/user-record";
import { getUserRecord } from "@/lib/admin/users";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.user");
  return { title: t("title"), robots: { index: false } };
}

export default function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  return (
    <div className="mx-auto w-full max-w-270">
      <Suspense fallback={<ListSkeleton label="" rows={4} />}>
        <Record params={params} />
      </Suspense>
    </div>
  );
}

async function Record({ params }: Pick<PageProps<"/admin/users/[id]">, "params">) {
  const { id } = await params;
  const t = await getTranslations("admin.users");
  const viewer = await requirePageRole("admin", `/admin/users/${id}`);
  const record = await getUserRecord(db, viewer, id);
  if (record === null) {
    notFound();
  }
  return (
    <>
      <PageHeader title={record.user.name.trim() || record.user.email} subtitle={t("title")} />
      <UserRecord record={record} viewerId={viewer.id} />
    </>
  );
}
