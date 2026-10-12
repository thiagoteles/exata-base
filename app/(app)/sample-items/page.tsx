import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { SampleItemsList } from "@/features/sample-items/list";
import { requirePageRole } from "@/lib/page-guard";
import { readerOf } from "@/lib/reader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sampleItems");
  return { title: t("title"), robots: { index: false } };
}

type Props = { searchParams: Promise<SearchParams> };

export default function SampleItemsPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <SampleItems searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SampleItems({ searchParams }: Props) {
  const t = await getTranslations("sampleItems");
  const user = await requirePageRole("member", "/sample-items");
  const { timeZone, locale } = await readerOf(user);
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        showBack={false}
        actions={[
          { key: "new", label: t("new"), variant: "primary", href: "/sample-items/new" as Route },
        ]}
      />
      <SampleItemsList
        viewer={user}
        scope="mine"
        timeZone={timeZone}
        locale={locale}
        searchParams={searchParams}
      />
    </>
  );
}
