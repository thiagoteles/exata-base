import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { productPlanPage } from "@/components/pages.product";
import { ListSkeleton } from "@/components/patterns/list-states";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { type PageSectionEntry, SectionedPage } from "@/components/patterns/sectioned-page";
import { TrialNotice } from "@/components/patterns/trial-notice";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { catalog, soldTiers } from "@/domain/billing/catalog";
import { isPaidTier } from "@/domain/billing/entitlements";
import { isFixedTerm } from "@/domain/billing/term";
import { trialStanding } from "@/domain/billing/trial";
import { currentInstant } from "@/domain/clock";
import { productPlanOffers } from "@/features/billing/offers.product";
import { CancellationControl, PortalButton } from "@/features/billing/plan-controls";
import { planState, planStateTone } from "@/features/billing/presentation";
import { paymentsOf } from "@/lib/billing/payments";
import { isCourtesy, type Plan, readPlan, subscriptionOf } from "@/lib/billing/service";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { publicHref } from "@/lib/i18n/public-paths";
import { formatMoney, toCents } from "@/lib/money";
import { requirePageRole } from "@/lib/page-guard";
import { paymentGateway } from "@/lib/ports/payment";
import { resolvePreferences } from "@/lib/preferences/resolve";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("plan");
  return { title: t("title"), robots: { index: false } };
}

type Props = { searchParams: Promise<{ checkout?: string | string[] }> };

export default function PlanPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-270">
      <Suspense fallback={<ListSkeleton label="" rows={3} />}>
        <PlanContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PlanContent({ searchParams }: Props) {
  const [t, receipts, query] = await Promise.all([
    getTranslations("plan"),
    getTranslations("plan.receipts"),
    searchParams,
  ]);
  const user = await requirePageRole("member", "/account/plan");
  // Read fresh: the plan changes by webhook, away from this person's session.
  const [plan, history] = await Promise.all([readPlan(db, user.id), paymentsOf(db, user.id)]);
  const { timeZone } = resolvePreferences(user.options);
  const settled = history.filter((payment) => payment.status === "paid");
  const Offers = productPlanOffers;
  const sections: PageSectionEntry[] = [
    ...notices(plan, query.checkout === "success", t),
    ...(Offers === null
      ? []
      : [{ key: "offers", title: null, content: <Offers plan={plan} userId={user.id} /> }]),
    { key: "plan", title: null, content: <PlanRecord plan={plan} timeZone={timeZone} /> },
    ...(settled.length === 0
      ? []
      : [
          {
            key: "receipts",
            title: receipts("title"),
            help: receipts("help"),
            content: <Receipts settled={settled} timeZone={timeZone} />,
          },
        ]),
  ];
  const Page = productPlanPage ?? SectionedPage;
  return (
    <Page
      title={t("title")}
      subtitle={t("subtitle")}
      controls={<PlanActions plan={plan} />}
      sections={sections}
    />
  );
}

/** What the person should know first: a payment being confirmed, a trial, a pending or late plan. */
function notices(
  plan: Plan | null,
  justPaid: boolean,
  t: Awaited<ReturnType<typeof getTranslations<"plan">>>,
): PageSectionEntry[] {
  const state = planState(plan);
  const paid = plan !== null && isPaidTier(plan.tier);
  const entries: PageSectionEntry[] = [];
  if (justPaid && !paid) {
    entries.push({
      key: "confirming",
      title: null,
      content: (
        <Panel tone="info" role="status">
          <p className="text-body text-ink">{t("confirming")}</p>
        </Panel>
      ),
    });
  }
  if (state === "trialing" && plan?.currentPeriodEnd) {
    entries.push({
      key: "trial",
      title: null,
      content: <TrialSection endsAt={plan.currentPeriodEnd} />,
    });
  }
  if (state === "pending") {
    entries.push({
      key: "pending",
      title: null,
      content: (
        <Panel tone="info" role="status">
          <p className="max-w-[60ch] text-body text-ink">{t("pending")}</p>
        </Panel>
      ),
    });
  }
  if (state === "pastDue") {
    entries.push({
      key: "pastDue",
      title: null,
      content: (
        <Panel role="alert" className="border-warning-ink">
          <p className="max-w-[60ch] text-body text-ink">{t("pastDue")}</p>
        </Panel>
      ),
    });
  }
  return entries;
}

/** What the date says: where a plan ends or renews. A year bought once has no renewal, only a last day. */
function dateLabel(plan: Plan) {
  if (isFixedTerm(plan.billingInterval)) {
    return "validUntil";
  }
  return plan.cancelAtPeriodEnd ? "endsOn" : "renewsOn";
}

/** The trial in progress: the days left in words and a bar of the days used, with the clock read once here. */
async function TrialSection({ endsAt }: { endsAt: Date }) {
  await connection();
  const t = await getTranslations("plan.trial");
  const standing = trialStanding({ endsAt, totalDays: catalog.trial.days, now: currentInstant() });
  return (
    <TrialNotice
      standing={standing}
      title={t("title")}
      summary={t("summary", { days: standing.daysLeft })}
      barLabel={t("bar")}
    />
  );
}

/** Whether the product sells several tiers, so a plan is named by its tier as well as its interval. */
const severalTiers = soldTiers().length > 1;

async function PlanRecord({ plan, timeZone }: { plan: Plan | null; timeZone: string }) {
  const [t, plans] = await Promise.all([getTranslations("plan"), getTranslations("plans")]);
  const state = planState(plan);
  const paid = plan !== null && isPaidTier(plan.tier);
  const cells = [
    true,
    paid,
    plan?.currentPeriodEnd !== null && plan?.currentPeriodEnd !== undefined,
    Boolean(plan?.courtesyReason),
  ].filter(Boolean).length;
  // As many columns as cells, so the grid never ends in an empty one; four make two rows of two.
  const columns = [
    "",
    "md:grid-cols-1 xl:grid-cols-1",
    "md:grid-cols-2 xl:grid-cols-2",
    "md:grid-cols-3 xl:grid-cols-3",
    "md:grid-cols-2 xl:grid-cols-2",
  ][cells];
  return (
    <RecordGrid className={columns}>
      <RecordCell
        label={t("plan")}
        // On the free plan the name already says it; a stamp would only repeat it.
        {...(state === "free"
          ? {}
          : { stamp: <Stamp tone={planStateTone[state]}>{t(`statuses.${state}`)}</Stamp> })}
      >
        {paid && severalTiers
          ? t("nameWithTier", {
              tier: plans(`tiers.${plan.tier}`),
              interval: t(`names.${plan.billingInterval ?? "free"}`),
            })
          : t(`names.${paid ? (plan.billingInterval ?? "free") : "free"}`)}
      </RecordCell>
      {paid ? (
        <RecordCell label={t("origin")}>
          {t(`origins.${isCourtesy(plan) ? "courtesy" : "purchase"}`)}
        </RecordCell>
      ) : null}
      {plan?.currentPeriodEnd ? (
        <RecordCell label={t(dateLabel(plan))}>
          <span className="font-mono text-data tabular-nums">
            {formatInstantDate(plan.currentPeriodEnd, timeZone)}
          </span>
        </RecordCell>
      ) : null}
      {plan?.courtesyReason ? (
        <RecordCell label={t("courtesyReason")}>{plan.courtesyReason}</RecordCell>
      ) : null}
    </RecordGrid>
  );
}

async function PlanActions({ plan }: { plan: Plan | null }) {
  const t = await getTranslations("plan");
  const billingOn = (await paymentGateway()) !== null;
  const subscribed = plan !== null && isPaidTier(plan.tier) && subscriptionOf(plan) !== null;
  // The header's controls: the danger first, the way forward last.
  return (
    <>
      {billingOn && subscribed ? <CancellationControl canceling={plan.cancelAtPeriodEnd} /> : null}
      {billingOn && plan?.providerCustomerId ? (
        <PortalButton switchesTier={severalTiers && subscribed} />
      ) : null}
      {(plan !== null && isPaidTier(plan.tier)) || productPlanOffers !== null ? null : (
        <Link href={publicHref("/plans")} className={buttonClasses("primary")}>
          {t("seePlans")}
        </Link>
      )}
    </>
  );
}

/** A receipt for each settled payment, set as a ledger: when and how much in large type, one plain link per row. */
async function Receipts({
  settled,
  timeZone,
}: {
  settled: Awaited<ReturnType<typeof paymentsOf>>;
  timeZone: string;
}) {
  const t = await getTranslations("plan.receipts");
  return (
    <ul className="flex flex-col divide-y divide-line border-b border-line">
      {settled.map((payment) => (
        <li
          key={payment.id}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-field-label text-ink">
              {formatMoney(toCents(payment.amountCents), payment.currency)}
            </p>
            <p className="text-body-small text-ink-muted">
              {t("paidOn", { date: formatInstantDate(payment.paidAt, timeZone) })}
            </p>
          </div>
          <a
            href={`/account/receipts/${payment.id}`}
            download
            className={buttonClasses("secondary")}
          >
            {t("download")}
          </a>
        </li>
      ))}
    </ul>
  );
}
