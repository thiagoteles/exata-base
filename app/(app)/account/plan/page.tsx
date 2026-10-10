import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { TrialNotice } from "@/components/patterns/trial-notice";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { catalog } from "@/domain/billing/catalog";
import { isPaidTier } from "@/domain/billing/entitlements";
import { isFixedTerm } from "@/domain/billing/term";
import { trialStanding } from "@/domain/billing/trial";
import { currentInstant } from "@/domain/clock";
import { CancellationControl, PortalButton } from "@/features/billing/plan-controls";
import { planState, planStateTone } from "@/features/billing/presentation";
import { paymentsOf } from "@/lib/billing/payments";
import { isCourtesy, type Plan, readPlan, subscriptionOf } from "@/lib/billing/service";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { publicHref } from "@/lib/i18n/public-paths";
import { formatPrice, toCents } from "@/lib/money";
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
  const [t, query] = await Promise.all([getTranslations("plan"), searchParams]);
  const user = await requirePageRole("member", "/account/plan");
  // Read fresh: the plan changes by webhook, away from this person's session.
  const plan = await readPlan(db, user.id);
  const state = planState(plan);
  const paid = plan !== null && isPaidTier(plan.tier);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <div className="flex flex-col gap-8">
        {query.checkout === "success" && !paid ? (
          <Panel tone="info" role="status">
            <p className="text-body text-ink">{t("confirming")}</p>
          </Panel>
        ) : null}
        {state === "trialing" && plan?.currentPeriodEnd ? (
          <TrialSection endsAt={plan.currentPeriodEnd} />
        ) : null}
        {state === "pending" ? (
          <Panel tone="info" role="status">
            <p className="max-w-[60ch] text-body text-ink">{t("pending")}</p>
          </Panel>
        ) : null}
        {state === "pastDue" ? (
          <Panel role="alert" className="border-warning-ink">
            <p className="max-w-[60ch] text-body text-ink">{t("pastDue")}</p>
          </Panel>
        ) : null}
        <PlanRecord plan={plan} timeZone={resolvePreferences(user.options).timeZone} />
        <PlanActions plan={plan} />
        <Receipts userId={user.id} timeZone={resolvePreferences(user.options).timeZone} />
      </div>
    </>
  );
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

async function PlanRecord({ plan, timeZone }: { plan: Plan | null; timeZone: string }) {
  const t = await getTranslations("plan");
  const state = planState(plan);
  const paid = plan !== null && isPaidTier(plan.tier);
  return (
    <RecordGrid>
      <RecordCell
        label={t("plan")}
        stamp={<Stamp tone={planStateTone[state]}>{t(`statuses.${state}`)}</Stamp>}
      >
        {t(`names.${paid ? (plan.billingInterval ?? "free") : "free"}`)}
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
        <RecordCell label={t("courtesyReason")} wide>
          {plan.courtesyReason}
        </RecordCell>
      ) : null}
    </RecordGrid>
  );
}

async function PlanActions({ plan }: { plan: Plan | null }) {
  const t = await getTranslations("plan");
  const billingOn = (await paymentGateway()) !== null;
  const subscribed = plan !== null && isPaidTier(plan.tier) && subscriptionOf(plan) !== null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {plan !== null && isPaidTier(plan.tier) ? null : (
        <Link href={publicHref("/plans")} className={buttonClasses("primary")}>
          {t("seePlans")}
        </Link>
      )}
      {billingOn && plan?.providerCustomerId ? <PortalButton /> : null}
      {billingOn && subscribed ? <CancellationControl canceling={plan.cancelAtPeriodEnd} /> : null}
    </div>
  );
}

/** A receipt for each settled payment, set as a ledger: when and how much in large type, one plain link per row. */
async function Receipts({ userId, timeZone }: { userId: string; timeZone: string }) {
  const [t, history] = await Promise.all([
    getTranslations("plan.receipts"),
    paymentsOf(db, userId),
  ]);
  const settled = history.filter((payment) => payment.status === "paid");
  if (settled.length === 0) {
    return null;
  }
  return (
    <Panel className="flex flex-col gap-4">
      <h2 className="text-block-title text-ink">{t("title")}</h2>
      <p className="max-w-[52ch] text-body-small text-ink-muted">{t("help")}</p>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {settled.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-field-label text-ink">
                {formatPrice(toCents(payment.amountCents), payment.currency)}
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
    </Panel>
  );
}
