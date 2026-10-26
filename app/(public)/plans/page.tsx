import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { ContentSection } from "@/components/patterns/content-section";
import { Faq } from "@/components/patterns/faq";
import { PageSection } from "@/components/patterns/page-section";
import { type PricingColumn, PricingTable } from "@/components/patterns/pricing-table";
import { RuntimeMarker } from "@/components/runtime-marker";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { catalog, soldTiers } from "@/domain/billing/catalog";
import { chooseCurrency, currenciesToOffer, priceIn } from "@/domain/billing/currency";
import { featuresOfTier, type Tier } from "@/domain/billing/entitlements";
import { trialDaysFor } from "@/domain/billing/trial";
import { BuyButton } from "@/features/billing/buy-button";
import { CurrencySwitch } from "@/features/billing/currency-switch";
import { sourceOf } from "@/features/billing/schema";
import { canBuy, readPlan, subscriptionOf } from "@/lib/billing/service";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { publicHref } from "@/lib/i18n/public-paths";
import { formatMoney, toCents } from "@/lib/money";
import { getCurrentUser } from "@/lib/ports/auth";
import { offeredIntervals, readPrices } from "@/lib/ports/payment";
import type { Interval, PriceTag } from "@/lib/ports/payment/types";
import { preferenceFromCookie, specFor } from "@/lib/preferences/resolve";
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
    ...((await offeredIntervals()).length === 0 ? { robots: { index: false } } : {}),
  };
}

const unitKey = {
  monthly: "perMonth",
  yearly: "perYear",
  yearly_once: "perYearOnce",
  lifetime: "once",
} as const;
const faqIds = ["cancel", "refund", "invoice"] as const;
/** The tiers on sale. With one, the page is a single table; with more, a section for each. */
const tiers = soldTiers() as Tier[];

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string | string[] }>;
}) {
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
          {tiers.length > 1 ? (
            <TierSections searchParams={searchParams} />
          ) : (
            <Offers tier={tiers[0] ?? (catalog.paidTier as Tier)} searchParams={searchParams} />
          )}
        </Suspense>
      </section>
      <ContentSection marker="FAQ" title={t("faq.title")} intro={t("faq.intro")}>
        <Faq items={faq} />
      </ContentSection>
      <JsonLd data={faqData(faq)} />
    </main>
  );
}

/** The free days this person would get for this way of buying: none after the first trial they ever had. */
const trialDaysOf = (plan: Awaited<ReturnType<typeof readPlan>>, interval: Interval) =>
  trialDaysFor({ trial: catalog.trial, interval, trialUsedAt: plan?.trialUsedAt ?? null });

type ActionContext = {
  tier: Tier;
  /** Whether the page sells several tiers, so the purchase names the one it is for. */
  several: boolean;
  interval: Interval;
  user: Awaited<ReturnType<typeof getCurrentUser>>;
  plan: Awaited<ReturnType<typeof readPlan>>;
  currency: string;
  source: string;
  t: Awaited<ReturnType<typeof getTranslations<"plans">>>;
};

/** The line under a price: what a purchase replaces, or the free days it starts with. */
function noteFor(input: {
  interval: Interval;
  plan: Awaited<ReturnType<typeof readPlan>>;
  trialDays: number;
  t: ActionContext["t"];
}) {
  const { interval, plan, trialDays, t } = input;
  if (interval === "lifetime" && subscriptionOf(plan) !== null) {
    return t("replaces.note");
  }
  return trialDays > 0 ? t("trialNote", { days: trialDays }) : undefined;
}

/** What a person can do about one way of buying: sign in, see it is theirs, wait for it, or buy it. */
function intervalAction({
  tier,
  several,
  interval,
  user,
  plan,
  currency,
  source,
  t,
}: ActionContext) {
  const trialDays = trialDaysOf(plan, interval);
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
  if (plan !== null && plan.tier === tier && plan.billingInterval === interval) {
    return <Stamp tone="success">{t("current")}</Stamp>;
  }
  if (plan?.status === "pending" && plan.priceKey === `${tier}.${interval}`) {
    return <Stamp tone="info">{t("awaiting")}</Stamp>;
  }
  if (!canBuy(plan, interval)) {
    return null;
  }
  return (
    <BuyButton
      {...(several ? { tier } : {})}
      interval={interval}
      currency={currency}
      trialDays={trialDays}
      source={source}
      replacesSubscription={interval === "lifetime" && subscriptionOf(plan) !== null}
    />
  );
}

type Query = Promise<{ source?: string | string[] }>;

/**
 * A section for each tier with a price on sale right now, in the catalog's order, each with its own
 * ways of buying. With none on sale the page says so once.
 */
async function TierSections({ searchParams }: { searchParams: Query }) {
  const t = await getTranslations("plans");
  const offered = await Promise.all(tiers.map(offeredIntervals));
  const onSale = tiers.filter((_, index) => (offered[index]?.length ?? 0) > 0);
  if (onSale.length === 0) {
    return <p className="text-body text-ink-muted">{t("none")}</p>;
  }
  return (
    <div className="flex flex-col gap-10">
      {onSale.map((tier, index) => (
        <PageSection key={tier} title={t(`tiers.${tier}`)}>
          <Offers tier={tier} searchParams={searchParams} several first={index === 0} />
        </PageSection>
      ))}
    </div>
  );
}

async function Offers({
  tier,
  searchParams,
  several = false,
  first = true,
}: {
  tier: Tier;
  searchParams: Query;
  /** One of several tiers on the page. */
  several?: boolean;
  /** The first table on the page, the one that carries the free column and the currency choice. */
  first?: boolean;
}) {
  const t = await getTranslations("plans");
  const source = sourceOf((await searchParams).source);
  const [intervals, prices, user] = await Promise.all([
    offeredIntervals(tier),
    readPrices(tier),
    getCurrentUser(),
  ]);
  if (intervals.length === 0) {
    return <p className="text-body text-ink-muted">{t("none")}</p>;
  }
  const plan = user === null ? null : await readPlan(db, user.id);
  const priceList = intervals.flatMap((interval) => prices[interval] ?? []);
  const offered = currenciesToOffer(catalog.currencies.offered, priceList);
  // The person's choice from the cookie the preference travels in, else the product's default.
  const jar = await cookies();
  const spec = specFor("currency", undefined);
  const currency =
    chooseCurrency({
      preferred: preferenceFromCookie("currency", jar.get(spec.name)?.value),
      defaultCurrency: catalog.currencies.default,
      available: offered,
    }) ?? catalog.currencies.default;
  const shown = intervals.filter((interval) => prices[interval] !== undefined);
  if (shown.length === 0) {
    return <p className="text-body text-ink-muted">{t("none")}</p>;
  }

  const inCurrency = (price: PriceTag) => priceIn(price, currency);
  const features = [...featuresOfTier(tier)];
  const freeHas = featuresOfTier("free");
  const tierHas = featuresOfTier(tier);
  const highlighted = shown.includes("yearly") ? "yearly" : shown[0];
  const columns: PricingColumn[] = [
    ...(first
      ? [
          {
            id: "free",
            name: t("names.free"),
            price: t("freePrice"),
            unit: t("freeUnit"),
            has: features.map((feature) => freeHas.has(feature)),
          },
        ]
      : []),
    ...shown.flatMap((interval) => {
      const price = prices[interval];
      if (price === undefined) {
        return [];
      }
      const trialDays = trialDaysOf(plan, interval);
      const note = noteFor({ interval, plan, trialDays, t });
      return [
        {
          id: several ? `${tier}-${interval}` : interval,
          name: t(`names.${interval}`),
          price: formatMoney(toCents(inCurrency(price).cents), inCurrency(price).currency),
          unit: t(unitKey[interval]),
          highlighted: interval === highlighted,
          ...(note === undefined ? {} : { note }),
          has: features.map((feature) => tierHas.has(feature)),
          action: intervalAction({ tier, several, interval, user, plan, currency, source, t }),
        },
      ];
    }),
  ];

  return (
    <>
      {first && offered.length > 1 ? (
        <div className="mb-6">
          <CurrencySwitch current={currency} options={offered} />
        </div>
      ) : null}
      <PricingTable
        caption={several ? t(`tiers.${tier}`) : t("title")}
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
              : offered.map((code) => ({
                  name: t(`names.${interval}`),
                  ...priceIn(price, code),
                }));
          }),
        )}
      />
    </>
  );
}
