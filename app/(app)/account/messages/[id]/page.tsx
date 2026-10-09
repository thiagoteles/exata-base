import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { ContactRecord } from "@/features/contact/contact-record";
import { getContact } from "@/lib/contact/service";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { resolvePreferences } from "@/lib/preferences/resolve";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myMessages");
  return { title: t("title"), robots: { index: false } };
}

export default function MyMessagePage({ params }: PageProps<"/account/messages/[id]">) {
  return (
    <div className="mx-auto w-full max-w-270">
      <Suspense fallback={<ListSkeleton label="" rows={4} />}>
        <Record params={params} />
      </Suspense>
    </div>
  );
}

async function Record({ params }: Pick<PageProps<"/account/messages/[id]">, "params">) {
  const { id } = await params;
  const t = await getTranslations("myMessages");
  const user = await requirePageRole("member", `/account/messages/${id}`);
  // The same record, but only a message this person wrote, and read-only: no staff controls.
  const message = await getContact(db, user, "mine", id);
  if (message === null) {
    notFound();
  }
  return (
    <>
      <PageHeader title={t("title")} />
      <ContactRecord
        message={message}
        canManage={false}
        timeZone={resolvePreferences(user.options).timeZone}
      />
    </>
  );
}
