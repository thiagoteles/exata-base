import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BarList } from "@/components/charts/bar-list";
import { StatTile } from "@/components/charts/stat-tile";
import { type Column, DataList } from "@/components/patterns/data-list";
import { ListEmpty } from "@/components/patterns/list-states";
import { PageSection } from "@/components/patterns/page-section";
import { Stamp, type StampTone } from "@/components/ui/stamp";
import type {
  RecentReferral,
  ReferralReport,
  ReferralTotals,
  TopReferrer,
} from "@/lib/admin/referrals";
import { formatInstantDate } from "@/lib/date";
import { formatBRL, toCents } from "@/lib/money";

const counts = new Intl.NumberFormat("pt-BR");
const brl = (cents: number) => formatBRL(toCents(cents));
const userHref = (id: string): Route => `/admin/users/${id}` as Route;

type Situation = "rewarded" | "awaitingCredit" | "paying" | "notPaying";
const situationTone = {
  rewarded: "success",
  awaitingCredit: "warning",
  paying: "success",
  notPaying: "neutral",
} as const satisfies Record<Situation, StampTone>;

function situationOf(row: RecentReferral, creditOn: boolean): Situation {
  if (row.rewarded) {
    return "rewarded";
  }
  if (!row.paying) {
    return "notPaying";
  }
  return creditOn && row.referrerId !== null ? "awaitingCredit" : "paying";
}

/** The program at a glance, who brought the most, from where, and the latest arrivals. */
export async function ReferralsBoard({
  report,
  creditOn,
}: {
  report: ReferralReport;
  /** Whether the product credits an inviter at all; without it the credit numbers say so. */
  creditOn: boolean;
}) {
  const t = await getTranslations("admin.referrals");
  if (report.totals.arrivals === 0) {
    return <ListEmpty title={t("empty")} body={t("emptyBody")} />;
  }
  return (
    <div className="flex flex-col gap-10">
      <Summary totals={report.totals} creditOn={creditOn} />
      <PageSection title={t("top")} help={t("topHelp")}>
        <TopReferrers rows={report.top} creditOn={creditOn} />
      </PageSection>
      <PageSection title={t("sources")} help={t("sourcesHelp")}>
        <BarList
          label={t("sources")}
          rows={report.sources.map((row) => ({
            key: row.source ?? "",
            label: row.source ?? t("noSource"),
            value: row.arrivals,
            valueText: counts.format(row.arrivals),
          }))}
        />
      </PageSection>
      <PageSection title={t("recent")} help={t("recentHelp")}>
        <RecentReferrals rows={report.recent} creditOn={creditOn} />
      </PageSection>
    </div>
  );
}

async function Summary({ totals, creditOn }: { totals: ReferralTotals; creditOn: boolean }) {
  const t = await getTranslations("admin.referrals");
  const share = String(Math.round((totals.paying / totals.arrivals) * 100));
  return (
    <section className="flex flex-col gap-3">
      <h2 className="sr-only">{t("summary")}</h2>
      <dl className="grid gap-px overflow-hidden rounded-cell border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t("arrivalsTotal")}
          value={counts.format(totals.arrivals)}
          note={t("arrivalsNote")}
        />
        <StatTile
          label={t("payingTotal")}
          value={counts.format(totals.paying)}
          note={t("payingNote", { share })}
        />
        <StatTile
          label={t("creditTotal")}
          value={creditOn ? brl(totals.rewardedCents) : t("creditOff")}
          note={creditOn ? t("creditNote", { count: totals.rewarded }) : t("creditOffNote")}
        />
        <StatTile
          label={t("awaitingTotal")}
          value={counts.format(creditOn ? totals.awaitingCredit : 0)}
          note={t("awaitingNote")}
        />
      </dl>
    </section>
  );
}

async function TopReferrers({
  rows,
  creditOn,
}: {
  rows: readonly TopReferrer[];
  creditOn: boolean;
}) {
  const t = await getTranslations("admin.referrals");
  const credit: Column<TopReferrer> = {
    key: "credit",
    header: t("credit"),
    numeric: true,
    cell: (row) => brl(row.rewardedCents),
  };
  const columns: Column<TopReferrer>[] = [
    {
      key: "email",
      header: t("referrer"),
      kind: "title",
      width: "2.4fr",
      cell: (row) =>
        row.referrerId === null ? (
          t("gone", { email: row.email })
        ) : (
          <Link
            href={userHref(row.referrerId)}
            className="text-link underline-offset-4 hover:underline"
          >
            {row.email}
          </Link>
        ),
    },
    {
      key: "arrivals",
      header: t("arrivals"),
      numeric: true,
      cell: (row) => counts.format(row.arrivals),
    },
    { key: "paying", header: t("paying"), numeric: true, cell: (row) => counts.format(row.paying) },
    ...(creditOn ? [credit] : []),
  ];
  return (
    <DataList
      label={t("top")}
      columns={columns}
      rows={rows}
      getKey={(row) => row.referrerId ?? `gone:${row.email}`}
    />
  );
}

async function RecentReferrals({
  rows,
  creditOn,
}: {
  rows: readonly RecentReferral[];
  creditOn: boolean;
}) {
  const t = await getTranslations("admin.referrals");
  const columns: Column<RecentReferral>[] = [
    {
      key: "referred",
      header: t("referred"),
      kind: "title",
      width: "2fr",
      cell: (row) => row.referredEmail,
    },
    {
      key: "referrer",
      header: t("invitedBy"),
      width: "2fr",
      cell: (row) =>
        row.referrerId === null ? t("gone", { email: row.referrerEmail }) : row.referrerEmail,
    },
    { key: "source", header: t("source"), cell: (row) => row.source ?? t("noSource") },
    {
      key: "date",
      header: t("date"),
      numeric: true,
      cell: (row) => formatInstantDate(row.createdAt),
    },
    {
      key: "situation",
      header: t("situation"),
      kind: "status",
      width: "1.3fr",
      cell: (row) => {
        const situation = situationOf(row, creditOn);
        return <Stamp tone={situationTone[situation]}>{t(`situations.${situation}`)}</Stamp>;
      },
    },
  ];
  return (
    <DataList
      label={t("recent")}
      columns={columns}
      rows={rows}
      getKey={(row) => row.id}
      rowHref={(row) => userHref(row.referredId)}
    />
  );
}
