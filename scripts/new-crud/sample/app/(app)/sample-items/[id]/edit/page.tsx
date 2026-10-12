import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/patterns/page-header";
import { SampleItemForm } from "@/features/sample-items/form";
import { sampleItemFormValues } from "@/features/sample-items/presentation";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { getSampleItem } from "@/lib/sample-items/records";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sampleItems");
  return { title: t("editTitle"), robots: { index: false } };
}

// The record is read before anything streams, so a record the reader may not see is not found, never an empty frame.
export const instant = false;

export default function EditSampleItemPage({ params }: PageProps<"/sample-items/[id]/edit">) {
  return (
    <div className="mx-auto w-full max-w-270">
      <EditSampleItem params={params} />
    </div>
  );
}

async function EditSampleItem({ params }: Pick<PageProps<"/sample-items/[id]/edit">, "params">) {
  const { id } = await params;
  const t = await getTranslations("sampleItems");
  const user = await requirePageRole("member", `/sample-items/${id}/edit`);
  const item = await getSampleItem(db, user, "mine", id);
  if (item === null) {
    notFound();
  }
  return (
    <>
      <PageHeader title={t("editTitle")} subtitle={item.name} />
      <SampleItemForm
        editing={{ id, seen: item.updatedAt.toISOString() }}
        initial={sampleItemFormValues(item)}
      />
    </>
  );
}
