import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Figure, RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { maskCpf } from "@/lib/masks";
import { buildSocialMetadata } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return await buildSocialMetadata({
    title: t("site.name"),
    description: t("site.description"),
    path: "/",
  });
}

const currencyMark = "R$";
const sampleTotal = "1.234,56";
const sampleDocument = "52998224725";

/*
 * The public home page: the display type and room to breathe, with a sample record next to the
 * text so the visitor sees how the product feels. The copy is a placeholder to be rewritten.
 */
export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <main className="mx-auto grid w-full max-w-310 gap-12 px-4 py-12 md:px-8 lg:grid-cols-2 lg:items-center lg:py-18">
      <div className="flex flex-col gap-6">
        <h1 className="text-display text-ink">{t("title")}</h1>
        <p className="max-w-[52ch] text-body text-ink-muted">{t("subtitle")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-up" className={buttonClasses("primary")}>
            {t("primary")}
          </Link>
          <Link href="/sign-in" className={buttonClasses("secondary")}>
            {t("secondary")}
          </Link>
        </div>
      </div>
      <RecordGrid aria-label={t("sampleLabel")} className="md:grid-cols-2 xl:grid-cols-2">
        <RecordCell
          label={t("sampleCustomer")}
          stamp={<Stamp tone="done">{t("sampleStatus")}</Stamp>}
        >
          {t("sampleName")}
        </RecordCell>
        <RecordCell label={t("sampleDocument")}>
          <span className="font-mono text-data tabular-nums">{maskCpf(sampleDocument)}</span>
        </RecordCell>
        <RecordCell label={t("sampleTotal")} wide>
          <Figure prefix={currencyMark}>{sampleTotal}</Figure>
        </RecordCell>
      </RecordGrid>
    </main>
  );
}
