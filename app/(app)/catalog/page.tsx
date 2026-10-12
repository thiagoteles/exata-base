import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { currentInstant } from "@/domain/clock";
import { AccentDemo } from "@/features/catalog/accent-demo";
import { ButtonsDemo } from "@/features/catalog/buttons-demo";
import { CatalogHeader } from "@/features/catalog/catalog-header";
import { ChoicesDemo } from "@/features/catalog/choices-demo";
import { CompositionDemo } from "@/features/catalog/composition-demo";
import { DensityDemo } from "@/features/catalog/density-demo";
import { FieldsDemo } from "@/features/catalog/fields-demo";
import { FiguresDemo } from "@/features/catalog/figures-demo";
import { FilesList } from "@/features/catalog/files-list";
import { LayersDemo } from "@/features/catalog/layers-demo";
import { MeasuresDemo } from "@/features/catalog/measures-demo";
import { OrdersList } from "@/features/catalog/orders-list";
import { PaidBlock } from "@/features/catalog/paid-block";
import { PaidPatternsDemo } from "@/features/catalog/paid-patterns-demo";
import { PaletteDemo } from "@/features/catalog/palette-demo";
import { PickersDemo } from "@/features/catalog/pickers-demo";
import { PublicDemo } from "@/features/catalog/public-demo";
import { RecordDemo } from "@/features/catalog/record-demo";
import { SaveDemo } from "@/features/catalog/save-demo";
import { CatalogSection } from "@/features/catalog/section";
import { StatesDemo } from "@/features/catalog/states-demo";
import { StructureDemo } from "@/features/catalog/structure-demo";
import { UploadDemo } from "@/features/catalog/upload-demo";
import { Wizard } from "@/features/catalog/wizard";
import { dateInSaoPaulo } from "@/lib/date";
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
  await connection();
  const user = await requirePageRole("staff", "/catalog");
  const files = await listFiles(db, user.id);
  return (
    <>
      <CatalogHeader />
      <div className="flex flex-col gap-16">
        <CatalogSection name="accent" title={t("accent.title")}>
          <AccentDemo />
        </CatalogSection>
        <CatalogSection name="palettes" title={t("palettes.title")}>
          <PaletteDemo />
        </CatalogSection>
        <CatalogSection name="choices" title={t("choices.title")}>
          <ChoicesDemo />
        </CatalogSection>
        <CatalogSection name="structure" title={t("structure.title")}>
          <StructureDemo />
        </CatalogSection>
        <CatalogSection name="measures" title={t("measures.title")}>
          <MeasuresDemo />
        </CatalogSection>
        <CatalogSection name="composition" title={t("composition.title")}>
          <CompositionDemo today={dateInSaoPaulo(currentInstant())} />
        </CatalogSection>
        <CatalogSection name="publicPatterns" title={t("publicPatterns.title")}>
          <PublicDemo />
        </CatalogSection>
        <CatalogSection name="figures" title={t("figures.title")}>
          <FiguresDemo />
        </CatalogSection>
        <CatalogSection name="paidPatterns" title={t("paidPatterns.title")}>
          <PaidPatternsDemo now={currentInstant().toISOString()} />
        </CatalogSection>
        <CatalogSection name="density" title={t("density.title")}>
          <DensityDemo />
        </CatalogSection>
        <CatalogSection name="buttons" title={t("buttons.title")}>
          <ButtonsDemo />
        </CatalogSection>
        <CatalogSection name="fields" title={t("fields.title")}>
          <FieldsDemo />
        </CatalogSection>
        <CatalogSection name="pickers" title={t("pickers.title")}>
          <PickersDemo />
        </CatalogSection>
        <CatalogSection name="layers" title={t("layers.title")}>
          <LayersDemo />
        </CatalogSection>
        <CatalogSection name="states" title={t("states.title")}>
          <StatesDemo />
        </CatalogSection>
        <CatalogSection name="list" title={t("list.title")}>
          <Suspense fallback={<ListSkeleton label={t("list.loading")} />}>
            <OrdersList searchParams={searchParams} />
          </Suspense>
        </CatalogSection>
        <CatalogSection name="record" title={t("record.title")}>
          <RecordDemo />
        </CatalogSection>
        <CatalogSection name="save" title={t("save.title")}>
          <SaveDemo />
        </CatalogSection>
        <CatalogSection name="wizard" title={t("wizard.title")}>
          <Wizard />
        </CatalogSection>
        <CatalogSection name="paid" snapshot={false} title={t("paid.title")}>
          <Suspense>
            <PaidBlock />
          </Suspense>
        </CatalogSection>
        <CatalogSection name="files" snapshot={false} title={t("files.title")}>
          <UploadDemo maxMb={env.UPLOAD_MAX_MB} types={env.UPLOAD_TYPES.join(", ")} />
          <FilesList files={files} />
        </CatalogSection>
      </div>
    </>
  );
}
