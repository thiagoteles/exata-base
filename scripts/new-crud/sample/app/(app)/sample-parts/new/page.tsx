import type { Metadata, Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListEmpty, ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { buttonClasses } from "@/components/ui/styles";
import { SamplePartForm } from "@/features/sample-parts/form";
import { emptySamplePart } from "@/features/sample-parts/schema";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { samplePartParents } from "@/lib/sample-parts/records";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sampleParts");
  return { title: t("newTitle"), robots: { index: false } };
}

type Props = PageProps<"/sample-parts/new">;

export default function NewSamplePartPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-270">
      <Suspense fallback={<ListSkeleton label="" rows={4} />}>
        <NewSamplePart searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewSamplePart({ searchParams }: Pick<Props, "searchParams">) {
  const t = await getTranslations("sampleParts");
  const user = await requirePageRole("member", "/sample-parts/new");
  const parents = await samplePartParents(db, user);
  const { parent } = await searchParams;
  // Opened from a sample item's page, the form starts under it, if it is one of the account's.
  const chosen = parents.find((row) => row.id === parent)?.id;
  return (
    <>
      <PageHeader title={t("newTitle")} />
      {parents.length === 0 ? (
        <ListEmpty
          title={t("needsParent")}
          action={
            <Link href={"/sample-items/new" as Route} className={buttonClasses("primary")}>
              {t("needsParentAction")}
            </Link>
          }
        />
      ) : (
        <SamplePartForm initial={emptySamplePart(chosen)} parents={parents} />
      )}
    </>
  );
}
