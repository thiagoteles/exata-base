import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { ClosingBand } from "@/components/patterns/closing-band";
import { ContentSection } from "@/components/patterns/content-section";
import { Faq } from "@/components/patterns/faq";
import { Hero } from "@/components/patterns/hero";
import { ProofStrip } from "@/components/patterns/proof-strip";
import { Figure, RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Showcase } from "@/components/patterns/showcase";
import { Voices } from "@/components/patterns/voices";
import { PrintTable, Sheet, SheetFooter, SheetHeader } from "@/components/print/sheet";
import { TrackedLink } from "@/components/tracked-link";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { env } from "@/lib/env";
import { maskCpf } from "@/lib/masks";
import { formatBRL, toCents } from "@/lib/money";
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

const proofIds = ["data", "free", "cancel", "brazil"] as const;
const stepIds = ["create", "fill", "follow"] as const;
const pointIds = ["real", "paper", "facts"] as const;
const voiceIds = ["paper", "sheet", "phone", "time"] as const;
const faqIds = ["start", "data", "cancel"] as const;
const sheetLines = [
  ["sheetLineOne", 2990],
  ["sheetLineTwo", 990],
] as const;

/*
 * The public home page, as a sample of every public pattern in the order a product usually wants
 * them: the hero with a real record arriving beside the words, the claims, how it works, one thing
 * the product does beside a real document, who it is for, the questions people ask, and the promise
 * once more. The copy is a placeholder to be rewritten; the structure is the part to keep.
 */
export default async function HomePage() {
  const t = await getTranslations("home");
  const faq = faqIds.map((id) => ({
    id,
    question: t(`faq.items.${id}.question`),
    answer: t(`faq.items.${id}.answer`),
  }));
  const actions = (where: string) => (
    <>
      <TrackedLink href="/sign-up" where={where} className={buttonClasses("primary")}>
        {t("primary")}
      </TrackedLink>
      <TrackedLink href="/sign-in" where={where} className={buttonClasses("secondary")}>
        {t("secondary")}
      </TrackedLink>
    </>
  );
  return (
    <main>
      <Hero
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={actions("hero")}
        aside={
          <RecordGrid
            aria-label={t("sampleLabel")}
            className="animate-enter enter-step-1 md:grid-cols-2 xl:grid-cols-2"
          >
            <RecordCell
              label={t("sampleCustomer")}
              stamp={
                <Stamp tone="success" className="animate-stamp enter-step-6">
                  {t("sampleStatus")}
                </Stamp>
              }
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
      <ProofStrip
        label={t("proof.label")}
        items={proofIds.map((id) => ({
          id,
          title: t(`proof.items.${id}.title`),
          body: t(`proof.items.${id}.body`),
        }))}
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
      <Showcase
        anchor="como-funciona"
        marker="02"
        title={t("showcase.title")}
        body={[t("showcase.body")]}
        points={pointIds.map((id) => t(`showcase.points.${id}`))}
        actions={
          <TrackedLink href="/sign-up" where="showcase" className={buttonClasses("secondary")}>
            {t("showcase.action")}
          </TrackedLink>
        }
        proof={
          <Sheet face="document" paper>
            <SheetHeader
              brand={t("showcase.sheetBrand")}
              title={t("showcase.sheetTitle")}
              date={t("showcase.sheetDate")}
              level={3}
            />
            <PrintTable
              caption={t("showcase.sheetCaption")}
              head={[t("showcase.sheetItem"), t("showcase.sheetAmount")]}
              rows={sheetLines.map(([key, cents]) => [
                t(`showcase.${key}`),
                <span key={key} className="font-mono tabular-nums">
                  {formatBRL(toCents(cents))}
                </span>,
              ])}
            />
            <SheetFooter>{t("showcase.sheetFooter")}</SheetFooter>
          </Sheet>
        }
      />
      <ContentSection marker="03" title={t("voices.title")} intro={t("voices.intro")}>
        <Voices
          label={t("voices.title")}
          items={voiceIds.map((id) => ({
            id,
            quote: t(`voices.items.${id}.quote`),
            answer: t(`voices.items.${id}.answer`),
          }))}
        />
      </ContentSection>
      <ContentSection marker="04" title={t("faq.title")} intro={t("faq.intro")}>
        <Faq items={faq} />
      </ContentSection>
      <ClosingBand
        title={t("closing.title")}
        body={t("closing.body")}
        actions={actions("closing")}
      />
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
