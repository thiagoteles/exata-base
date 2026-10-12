import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { ContactList } from "@/features/contact/contact-list";
import { requirePageRole } from "@/lib/page-guard";
import { resolvePreferences } from "@/lib/preferences/resolve";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inbox");
  return { title: t("title"), robots: { index: false } };
}

type Props = { searchParams: Promise<SearchParams> };

export default function InboxPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <Inbox searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Inbox({ searchParams }: Props) {
  const t = await getTranslations("inbox");
  const user = await requirePageRole("staff", "/staff/contacts");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <ContactList
        viewer={user}
        scope="all"
        timeZone={resolvePreferences(user.options).timeZone}
        searchParams={searchParams}
      />
    </>
  );
}
