import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { CancellationControl, PortalButton } from "@/features/billing/plan-controls";
import { planState, planStateTone } from "@/features/billing/presentation";
import { isCourtesy, type Plan, readPlan, subscriptionOf } from "@/lib/billing/service";
import { formatInstantDate } from "@/lib/date";
import { db } from "@/lib/db/client";
import { requirePageRole } from "@/lib/page-guard";
import { paymentGateway } from "@/lib/ports/payment";

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
  const paid = plan?.tier === "paid";
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <div className="flex flex-col gap-8">
        {query.checkout === "success" && !paid ? (
          <Panel level="highlight" role="status">
            <p className="text-body text-ink">{t("confirming")}</p>
          </Panel>
        ) : null}
        {state === "pastDue" ? (
          <Panel role="alert" className="border-warning-ink">
            <p className="max-w-[60ch] text-body text-ink">{t("pastDue")}</p>
          </Panel>
        ) : null}
        <PlanRecord plan={plan} />
        <PlanActions plan={plan} />
      </div>
    </>
  );
}

async function PlanRecord({ plan }: { plan: Plan | null }) {
  const t = await getTranslations("plan");
  const state = planState(plan);
  const paid = plan !== null && plan.tier === "paid";
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
        <RecordCell label={t(plan.cancelAtPeriodEnd ? "endsOn" : "renewsOn")}>
          <span className="font-mono text-data tabular-nums">
            {formatInstantDate(plan.currentPeriodEnd)}
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
  const subscribed = plan?.tier === "paid" && subscriptionOf(plan) !== null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {plan?.tier === "paid" ? null : (
        <Link href="/plans" className={buttonClasses("primary")}>
          {t("seePlans")}
        </Link>
      )}
      {billingOn && plan?.providerCustomerId ? <PortalButton /> : null}
      {billingOn && subscribed ? <CancellationControl canceling={plan.cancelAtPeriodEnd} /> : null}
    </div>
  );
}
