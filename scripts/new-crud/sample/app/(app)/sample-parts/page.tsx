import type { Metadata, Route } from "next";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { SamplePartsList } from "@/features/sample-parts/list";
import { requirePageRole } from "@/lib/page-guard";
import { readerOf } from "@/lib/reader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sampleParts");
  return { title: t("title"), robots: { index: false } };
}

type Props = { searchParams: Promise<SearchParams> };

export default function SamplePartsPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <SampleParts searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SampleParts({ searchParams }: Props) {
  const t = await getTranslations("sampleParts");
  const user = await requirePageRole("member", "/sample-parts");
  const { timeZone, locale } = await readerOf(user);
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        showBack={false}
        actions={[
          { key: "new", label: t("new"), variant: "primary", href: "/sample-parts/new" as Route },
        ]}
      />
      <SamplePartsList
        viewer={user}
        scope="mine"
        timeZone={timeZone}
        locale={locale}
        searchParams={searchParams}
      />
    </>
  );
}
