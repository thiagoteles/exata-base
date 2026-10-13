import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/patterns/page-header";
import { SamplePartForm } from "@/features/sample-parts/form";
import { samplePartFormValues } from "@/features/sample-parts/presentation";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { getSamplePart, samplePartParents } from "@/lib/sample-parts/records";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sampleParts");
  return { title: t("editTitle"), robots: { index: false } };
}

// The record is read before anything streams, so a record the reader may not see is not found, never an empty frame.
export const instant = false;

export default function EditSamplePartPage({ params }: PageProps<"/sample-parts/[id]/edit">) {
  return (
    <div className="mx-auto w-full max-w-270">
      <EditSamplePart params={params} />
    </div>
  );
}

async function EditSamplePart({ params }: Pick<PageProps<"/sample-parts/[id]/edit">, "params">) {
  const { id } = await params;
  const t = await getTranslations("sampleParts");
  const user = await requirePageRole("member", `/sample-parts/${id}/edit`);
  const item = await getSamplePart(db, user, "mine", id);
  if (item === null) {
    notFound();
  }
  const parents = await samplePartParents(db, user);
  return (
    <>
      <PageHeader title={t("editTitle")} subtitle={item.name} />
      <SamplePartForm
        editing={{ id, seen: item.updatedAt.toISOString() }}
        initial={samplePartFormValues(item)}
        parents={parents}
      />
    </>
  );
}
