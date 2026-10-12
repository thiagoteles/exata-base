import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { SampleItemForm } from "@/features/sample-items/form";
import { emptySampleItem } from "@/features/sample-items/schema";
import { requirePageRole } from "@/lib/page-guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sampleItems");
  return { title: t("newTitle"), robots: { index: false } };
}

export default function NewSampleItemPage() {
  return (
    <div className="mx-auto w-full max-w-270">
      <Suspense fallback={<ListSkeleton label="" rows={4} />}>
        <NewSampleItem />
      </Suspense>
    </div>
  );
}

async function NewSampleItem() {
  const t = await getTranslations("sampleItems");
  await requirePageRole("member", "/sample-items/new");
  return (
    <>
      <PageHeader title={t("newTitle")} />
      <SampleItemForm initial={emptySampleItem} />
    </>
  );
}
