import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/patterns/page-header";
import { editSamplePartHref } from "@/features/sample-parts/presentation";
import { SamplePartRecord } from "@/features/sample-parts/record";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { readerOf } from "@/lib/reader";
import { getSamplePart } from "@/lib/sample-parts/records";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sampleParts");
  return { title: t("title"), robots: { index: false } };
}

// The record is read before anything streams, so a record the reader may not see is not found, never an empty frame.
export const instant = false;

export default function SamplePartPage({ params }: PageProps<"/sample-parts/[id]">) {
  return (
    <div className="mx-auto w-full max-w-270">
      <SamplePart params={params} />
    </div>
  );
}

async function SamplePart({ params }: Pick<PageProps<"/sample-parts/[id]">, "params">) {
  const { id } = await params;
  const t = await getTranslations("sampleParts");
  const user = await requirePageRole("member", `/sample-parts/${id}`);
  const item = await getSamplePart(db, user, "mine", id);
  if (item === null) {
    notFound();
  }
  const { timeZone, locale } = await readerOf(user);
  return (
    <>
      <PageHeader
        title={item.name}
        subtitle={t("title")}
        actions={[{ key: "edit", label: t("edit"), href: editSamplePartHref(id) }]}
      />
      <SamplePartRecord item={item} canManage timeZone={timeZone} locale={locale} />
    </>
  );
}
