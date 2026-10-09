import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { ContentSection } from "@/components/patterns/content-section";
import { Faq } from "@/components/patterns/faq";
import { type PricingColumn, PricingTable } from "@/components/patterns/pricing-table";
import { RuntimeMarker } from "@/components/runtime-marker";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { catalog } from "@/domain/billing/catalog";
import { featuresOfTier, isPaidTier } from "@/domain/billing/entitlements";
import { BuyButton } from "@/features/billing/buy-button";
import { canBuy, readPlan, subscriptionOf } from "@/lib/billing/service";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { publicHref } from "@/lib/i18n/public-paths";
import { formatPrice, toCents } from "@/lib/money";
import { getCurrentUser } from "@/lib/ports/auth";
import { offeredIntervals, readPrices } from "@/lib/ports/payment";
import type { Interval } from "@/lib/ports/payment/types";
import { signInRedirect } from "@/lib/routes";
import { buildSocialMetadata } from "@/lib/social-metadata";
import { faqData, productData } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("plans");
  return {
    ...(await buildSocialMetadata({
      title: t("title"),
      description: t("subtitle"),
      path: "/plans",
    })),
    // With no price on sale there is nothing here for a search engine to list.
    ...(offeredIntervals().length === 0 ? { robots: { index: false } } : {}),
  };
}

const unitKey = { monthly: "perMonth", yearly: "perYear", lifetime: "once" } as const;
const faqIds = ["cancel", "refund", "invoice"] as const;
const features = [...featuresOfTier(catalog.paidTier)];

export default async function PlansPage() {
  const t = await getTranslations("plans");
  const faq = faqIds.map((id) => ({
    id,
    question: t(`faq.items.${id}.question`),
    answer: t(`faq.items.${id}.answer`),
  }));
  return (
    <main>
      <RuntimeMarker />
      <section className="mx-auto w-full max-w-310 px-4 py-12 md:px-8 md:py-18">
        <h1 className="text-page-title text-ink">{t("title")}</h1>
        <p className="mt-2 mb-10 max-w-[52ch] text-body text-ink-muted">{t("subtitle")}</p>
        <Suspense fallback={<div className="h-64 rounded-cell bg-sunken" />}>
          <Offers />
        </Suspense>
      </section>
      <ContentSection marker="FAQ" title={t("faq.title")} intro={t("faq.intro")}>
        <Faq items={faq} />
      </ContentSection>
      <JsonLd data={faqData(faq)} />
    </main>
  );
}

async function Offers() {
  const t = await getTranslations("plans");
  const intervals = offeredIntervals();
  if (intervals.length === 0) {
    return <p className="text-body text-ink-muted">{t("none")}</p>;
  }
  const [prices, user] = await Promise.all([readPrices(), getCurrentUser()]);
  const plan = user === null ? null : await readPlan(db, user.id);
  const shown = intervals.filter((interval) => prices[interval] !== undefined);
  if (shown.length === 0) {
    return <p className="text-body text-ink-muted">{t("none")}</p>;
  }

  const action = (interval: Interval) => {
    if (user === null) {
      return (
        <Link
          href={signInRedirect(publicHref("/plans"), "") as never}
          className={buttonClasses("primary")}
        >
          {t("signIn")}
        </Link>
      );
    }
    if (plan !== null && isPaidTier(plan.tier) && plan.billingInterval === interval) {
      return <Stamp tone="done">{t("current")}</Stamp>;
    }
    if (!canBuy(plan, interval)) {
      return null;
    }
    return (
      <BuyButton
        interval={interval}
        replacesSubscription={interval === "lifetime" && subscriptionOf(plan) !== null}
      />
    );
  };

  const freeHas = featuresOfTier("free");
  const paidHas = featuresOfTier(catalog.paidTier);
  const highlighted = shown.includes("yearly") ? "yearly" : shown[0];
  const columns: PricingColumn[] = [
    {
      id: "free",
      name: t("names.free"),
      price: t("freePrice"),
      unit: t("freeUnit"),
      has: features.map((feature) => freeHas.has(feature)),
    },
    ...shown.flatMap((interval) => {
      const price = prices[interval];
      if (price === undefined) {
        return [];
      }
      const note =
        interval === "lifetime" && subscriptionOf(plan) !== null ? t("replaces.note") : undefined;
      return [
        {
          id: interval,
          name: t(`names.${interval}`),
          price: formatPrice(toCents(price.cents), price.currency),
          unit: t(unitKey[interval]),
          highlighted: interval === highlighted,
          ...(note === undefined ? {} : { note }),
          has: features.map((feature) => paidHas.has(feature)),
          action: action(interval),
        },
      ];
    }),
  ];

  return (
    <>
      <PricingTable
        caption={t("title")}
        featuresLabel={t("compare")}
        includedLabel={t("included")}
        excludedLabel={t("notIncluded")}
        features={features.map((feature) => t(`features.${feature}`))}
        columns={columns}
      />
      <JsonLd
        data={productData(
          env.APP_URL,
          { name: t("productName"), description: t("subtitle"), path: publicHref("/plans") },
          shown.flatMap((interval) => {
            const price = prices[interval];
            return price === undefined
              ? []
              : [{ name: t(`names.${interval}`), cents: price.cents, currency: price.currency }];
          }),
        )}
      />
    </>
  );
}
