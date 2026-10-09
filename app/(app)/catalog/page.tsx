import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { AccentDemo } from "@/features/catalog/accent-demo";
import { ButtonsDemo } from "@/features/catalog/buttons-demo";
import { CatalogHeader } from "@/features/catalog/catalog-header";
import { ChoicesDemo } from "@/features/catalog/choices-demo";
import { FieldsDemo } from "@/features/catalog/fields-demo";
import { FilesList } from "@/features/catalog/files-list";
import { LayersDemo } from "@/features/catalog/layers-demo";
import { OrdersList } from "@/features/catalog/orders-list";
import { PaidBlock } from "@/features/catalog/paid-block";
import { PaletteDemo } from "@/features/catalog/palette-demo";
import { PickersDemo } from "@/features/catalog/pickers-demo";
import { RecordDemo } from "@/features/catalog/record-demo";
import { SaveDemo } from "@/features/catalog/save-demo";
import { CatalogSection } from "@/features/catalog/section";
import { StatesDemo } from "@/features/catalog/states-demo";
import { UploadDemo } from "@/features/catalog/upload-demo";
import { Wizard } from "@/features/catalog/wizard";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { listFiles } from "@/lib/files/service";
import { requirePageRole } from "@/lib/page-guard";
import { buildSocialMetadata } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog");
  // The catalog is a working tool for the team, never a page for search engines.
  return {
    ...(await buildSocialMetadata({
      title: t("title"),
      description: t("subtitle"),
      path: "/catalog",
    })),
    robots: { index: false, follow: false },
  };
}

export default function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="mx-auto w-full max-w-310">
      <Suspense fallback={<ListSkeleton label="" />}>
        <CatalogContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CatalogContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const t = await getTranslations("catalog");
  const user = await requirePageRole("staff", "/catalog");
  const files = await listFiles(db, user.id);
  return (
    <>
      <CatalogHeader />
      <div className="flex flex-col gap-16">
        <CatalogSection title={t("accent.title")}>
          <AccentDemo />
        </CatalogSection>
        <CatalogSection title={t("palettes.title")}>
          <PaletteDemo />
        </CatalogSection>
        <CatalogSection title={t("choices.title")}>
          <ChoicesDemo />
        </CatalogSection>
        <CatalogSection title={t("buttons.title")}>
          <ButtonsDemo />
        </CatalogSection>
        <CatalogSection title={t("fields.title")}>
          <FieldsDemo />
        </CatalogSection>
        <CatalogSection title={t("pickers.title")}>
          <PickersDemo />
        </CatalogSection>
        <CatalogSection title={t("layers.title")}>
          <LayersDemo />
        </CatalogSection>
        <CatalogSection title={t("states.title")}>
          <StatesDemo />
        </CatalogSection>
        <CatalogSection title={t("list.title")}>
          <Suspense fallback={<ListSkeleton label={t("list.loading")} />}>
            <OrdersList searchParams={searchParams} />
          </Suspense>
        </CatalogSection>
        <CatalogSection title={t("record.title")}>
          <RecordDemo />
        </CatalogSection>
        <CatalogSection title={t("save.title")}>
          <SaveDemo />
        </CatalogSection>
        <CatalogSection title={t("wizard.title")}>
          <Wizard />
        </CatalogSection>
        <CatalogSection title={t("paid.title")}>
          <Suspense>
            <PaidBlock />
          </Suspense>
        </CatalogSection>
        <CatalogSection title={t("files.title")}>
          <UploadDemo maxMb={env.UPLOAD_MAX_MB} types={env.UPLOAD_TYPES.join(", ")} />
          <FilesList files={files} />
        </CatalogSection>
      </div>
    </>
  );
}
