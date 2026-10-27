import { useTranslations } from "next-intl";
import { Heatmap } from "@/components/charts/heatmap";
import { LineChart } from "@/components/charts/line-chart";

const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const signUps = [12, 18, 15, 24, 31, 28, 35, 41, 38, 46, 52, 49];
// Fixed counts, so the picture never moves: one item that never happened, one that leads.
const draws = [7, 3, 9, 12, 5, 0, 8, 14, 6, 10, 4, 11, 13, 2, 9, 7, 15, 6, 8, 5, 10, 3, 12, 9, 1];

/** The two data charts the base adds to the column chart and the bar list, with fixed values. */
export function ChartsDemo() {
  const t = useTranslations("catalog.charts");
  const count = new Intl.NumberFormat("pt-BR");
  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-[52ch] text-body-small text-ink-muted">{t("help")}</p>
      <LineChart
        title={t("line.title")}
        axis="count"
        points={months.map((month, index) => ({
          key: month,
          tick: month,
          label: month,
          value: signUps[index] ?? 0,
          valueText: count.format(signUps[index] ?? 0),
        }))}
        tableLabel={t("line.table")}
        headers={{ label: t("line.label"), value: t("line.value") }}
      />
      <Heatmap
        title={t("heat.title")}
        columns={5}
        cells={draws.map((value, index) => ({
          key: String(index + 1),
          label: String(index + 1).padStart(2, "0"),
          value,
          valueText: count.format(value),
        }))}
        legend={{ less: t("heat.less"), more: t("heat.more") }}
        tableLabel={t("heat.table")}
        headers={{ label: t("heat.label"), value: t("heat.value") }}
      />
    </div>
  );
}
