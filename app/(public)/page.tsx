import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { ContentSection } from "@/components/patterns/content-section";
import { Faq } from "@/components/patterns/faq";
import { Hero } from "@/components/patterns/hero";
import { Figure, RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { env } from "@/lib/env";
import { maskCpf } from "@/lib/masks";
import { buildSocialMetadata } from "@/lib/social-metadata";
import { faqData, organizationData, websiteData } from "@/lib/structured-data";

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

const stepIds = ["create", "fill", "follow"] as const;
const faqIds = ["start", "data", "cancel"] as const;

/*
 * The public home page: a hero with a sample record beside the words, then how it works as a numbered
 * ledger, then the questions people ask. The copy is a placeholder to be rewritten.
 */
export default async function HomePage() {
  const t = await getTranslations("home");
  const faq = faqIds.map((id) => ({
    id,
    question: t(`faq.items.${id}.question`),
    answer: t(`faq.items.${id}.answer`),
  }));
  return (
    <main>
      <Hero
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Link href="/sign-up" className={buttonClasses("primary")}>
              {t("primary")}
            </Link>
            <Link href="/sign-in" className={buttonClasses("secondary")}>
              {t("secondary")}
            </Link>
          </>
        }
        aside={
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
        }
      />
      <ContentSection marker="01" title={t("steps.title")} intro={t("steps.intro")}>
        <ol className="flex flex-col divide-y divide-line">
          {stepIds.map((id, index) => (
            <li key={id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 py-5 first:pt-0">
              <span aria-hidden="true" className="font-mono text-data text-brand-ink tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-field-label text-ink">{t(`steps.items.${id}.title`)}</h3>
                <p className="max-w-[56ch] text-body text-ink-muted">
                  {t(`steps.items.${id}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </ContentSection>
      <ContentSection marker="02" title={t("faq.title")} intro={t("faq.intro")}>
        <Faq items={faq} />
      </ContentSection>
      <JsonLd data={faqData(faq)} />
      <Suspense>
        <SiteData />
      </Suspense>
    </main>
  );
}

/** Who publishes the site, for search engines. Built per request, with the runtime address. */
async function SiteData() {
  await connection();
  const t = await getTranslations("site");
  return (
    <>
      <JsonLd data={organizationData(env.APP_URL, t("name"), t("description"))} />
      <JsonLd data={websiteData(env.APP_URL, t("name"))} />
    </>
  );
}
