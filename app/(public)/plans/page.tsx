import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Figure } from "@/components/patterns/record-grid";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { isPaidTier } from "@/domain/billing/entitlements";
import { BuyButton } from "@/features/billing/buy-button";
import { canBuy, readPlan, subscriptionOf } from "@/lib/billing/service";
import { db } from "@/lib/db/client";
import { publicHref } from "@/lib/i18n/public-paths";
import { formatPrice, toCents } from "@/lib/money";
import { getCurrentUser } from "@/lib/ports/auth";
import { offeredIntervals, readPrices } from "@/lib/ports/payment";
import type { Interval } from "@/lib/ports/payment/types";
import { signInRedirect } from "@/lib/routes";
import { buildSocialMetadata } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("plans");
  return {
    ...buildSocialMetadata({ title: t("title"), description: t("subtitle"), path: "/plans" }),
    // With no price on sale there is nothing here for a search engine to list.
    ...(offeredIntervals().length === 0 ? { robots: { index: false } } : {}),
  };
}

const unitKey = { monthly: "perMonth", yearly: "perYear", lifetime: "once" } as const;

export default async function PlansPage() {
  const t = await getTranslations("plans");
  return (
    <main className="mx-auto w-full max-w-310 px-4 py-12 md:px-8 md:py-18">
      <h1 className="text-page-title text-ink">{t("title")}</h1>
      <p className="mt-2 mb-10 max-w-[52ch] text-body text-ink-muted">{t("subtitle")}</p>
      <Suspense fallback={<div className="h-64 rounded-cell bg-sunken" />}>
        <Offers />
      </Suspense>
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

  return (
    <ul
      className="grid gap-px overflow-hidden rounded-cell border border-line bg-line md:grid-flow-col md:auto-cols-fr"
      aria-label={t("title")}
    >
      {shown.map((interval) => {
        const price = prices[interval];
        return (
          <li key={interval} className="flex flex-col gap-6 bg-surface p-6 md:p-8">
            <h2 className="text-label text-ink-muted">{t(`names.${interval}`)}</h2>
            {price === undefined ? null : (
              <p>
                <Figure>{formatPrice(toCents(price.cents), price.currency)}</Figure>
                <span className="mt-1 block text-body-small text-ink-muted">
                  {t(unitKey[interval])}
                </span>
              </p>
            )}
            {interval === "lifetime" && subscriptionOf(plan) !== null ? (
              <p className="text-body-small text-ink">{t("replaces.note")}</p>
            ) : null}
            <div className="mt-auto">{action(interval)}</div>
          </li>
        );
      })}
    </ul>
  );
}
