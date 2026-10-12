import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BarList } from "@/components/charts/bar-list";
import { ColumnChart } from "@/components/charts/column-chart";
import { StatTile } from "@/components/charts/stat-tile";
import {
  type BusinessNumbers,
  type DayValue,
  type RangeDays,
  rangeDays,
} from "@/lib/admin/numbers";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/date";
import { formatBRL, toCents } from "@/lib/money";

const counts = new Intl.NumberFormat("pt-BR");
const brl = (cents: number) => formatBRL(toCents(cents));
const total = (days: readonly DayValue[]) => days.reduce((sum, day) => sum + day.value, 0);
const shortDay = (day: string) => formatDate(day as Parameters<typeof formatDate>[0]).slice(0, 5);

/** The period filter, the headline numbers, then the charts; the filter scopes all of them. */
export async function NumbersBoard({
  numbers,
  range,
}: {
  numbers: BusinessNumbers;
  range: RangeDays;
}) {
  const [t, plans] = await Promise.all([
    getTranslations("admin.numbers"),
    getTranslations("admin.plans"),
  ]);
  const payers = numbers.payersByTier.reduce((sum, row) => sum + row.count, 0);
  const columns = (days: readonly DayValue[], text: (value: number) => string) =>
    days.map((day) => ({
      key: day.day,
      tick: shortDay(day.day),
      label: formatDate(day.day),
      value: day.value,
      valueText: text(day.value),
    }));
  const headers = { label: t("day"), value: t("value") };

  return (
    <div className="flex flex-col gap-10">
      <nav aria-label={t("range")} className="flex flex-wrap gap-2">
        {rangeDays.map((days) => (
          <Link
            key={days}
            href={`/admin/numbers?range=${days}`}
            aria-current={days === range ? "page" : undefined}
            className={cn(
              "inline-flex h-chip items-center rounded-full border border-line-strong px-4 text-label text-ink hover:border-ink",
              days === range && "border-ink bg-action text-on-action",
            )}
          >
            {t(`ranges.${days}`)}
          </Link>
        ))}
      </nav>

      <section className="flex flex-col gap-3">
        <h2 className="sr-only">{t("summary")}</h2>
        <dl className="grid gap-px overflow-hidden rounded-cell border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            label={t("signups")}
            value={counts.format(total(numbers.signups))}
            trend={numbers.signups.map((day) => day.value)}
          />
          <StatTile
            label={t("revenue")}
            value={brl(total(numbers.revenueCents))}
            note={t("revenueNote")}
            trend={numbers.revenueCents.map((day) => day.value)}
          />
          <StatTile
            label={t("payers")}
            value={counts.format(payers)}
            note={t("payersNote", { courtesies: numbers.courtesies })}
          />
          <StatTile
            label={t("refunded")}
            value={brl(numbers.refundedCents)}
            note={t("refundedNote")}
          />
          <StatTile
            label={t("cancellations")}
            value={counts.format(numbers.scheduledCancellations)}
            note={t("cancellationsNote")}
          />
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-section text-ink">{t("signupsByDay")}</h2>
        <ColumnChart
          title={t("signupsByDay")}
          columns={columns(numbers.signups, (value) => counts.format(value))}
          axis="count"
          tableLabel={t("table")}
          headers={headers}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-section text-ink">{t("revenueByDay")}</h2>
        <ColumnChart
          title={t("revenueByDay")}
          columns={columns(numbers.revenueCents, brl)}
          axis="brl"
          tableLabel={t("table")}
          headers={headers}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-section text-ink">{t("payersByPlan")}</h2>
        <BarList
          label={t("payersByPlan")}
          rows={numbers.payersByTier.map((row) => ({
            key: row.tier,
            label: plans(row.tier),
            value: row.count,
            valueText: counts.format(row.count),
          }))}
        />
      </section>
    </div>
  );
}
