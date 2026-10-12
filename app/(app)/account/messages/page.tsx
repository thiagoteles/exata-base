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
  const t = await getTranslations("myMessages");
  return { title: t("title"), robots: { index: false } };
}

type Props = { searchParams: Promise<SearchParams> };

export default function MyMessagesPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <MyMessages searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MyMessages({ searchParams }: Props) {
  const t = await getTranslations("myMessages");
  const user = await requirePageRole("member", "/account/messages");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <ContactList
        viewer={user}
        scope="mine"
        timeZone={resolvePreferences(user.options).timeZone}
        searchParams={searchParams}
      />
    </>
  );
}
