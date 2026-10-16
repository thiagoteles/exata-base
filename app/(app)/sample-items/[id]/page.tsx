import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/patterns/page-header";
import { buttonClasses } from "@/components/ui/styles";
import { DeleteSampleItem } from "@/features/sample-items/delete-record";
import { editSampleItemHref } from "@/features/sample-items/presentation";
import { SampleItemRecord } from "@/features/sample-items/record";
import { SamplePartsOfSampleItem } from "@/features/sample-parts/of-parent";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { readerOf } from "@/lib/reader";
import { getSampleItem } from "@/lib/sample-items/records";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sampleItems");
  return { title: t("title"), robots: { index: false } };
}

// The record is read before anything streams, so a record the reader may not see is not found, never an empty frame.
export const instant = false;

export default function SampleItemPage({ params }: PageProps<"/sample-items/[id]">) {
  return (
    <div className="mx-auto w-full max-w-270">
      <SampleItem params={params} />
    </div>
  );
}

async function SampleItem({ params }: Pick<PageProps<"/sample-items/[id]">, "params">) {
  const { id } = await params;
  const t = await getTranslations("sampleItems");
  const user = await requirePageRole("member", `/sample-items/${id}`);
  const item = await getSampleItem(db, user, "mine", id);
  if (item === null) {
    notFound();
  }
  const { timeZone, locale } = await readerOf(user);
  return (
    <>
      {/* The page anatomy: the record's actions in the header (the dangerous one first), the record
          right under it, then the records filed under it as a section. */}
      <PageHeader
        title={item.name}
        controls={
          <>
            <DeleteSampleItem id={item.id} name={item.name} />
            <Link href={editSampleItemHref(id)} className={buttonClasses("secondary")}>
              {t("edit")}
            </Link>
          </>
        }
      />
      <div className="flex flex-col gap-10">
        <SampleItemRecord item={item} timeZone={timeZone} locale={locale} />
        <SamplePartsOfSampleItem viewer={user} scope="mine" sampleItemId={id} canManage />
      </div>
    </>
  );
}
