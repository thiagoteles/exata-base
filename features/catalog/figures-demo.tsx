import { useTranslations } from "next-intl";
import { ArcGauge } from "@/components/figures/arc-gauge";

/** The neutral figure of the family: a dial that reads a quantity, in three readings. */
export function FiguresDemo() {
  const t = useTranslations("catalog.figures");
  const readings = [18, 62, 94];
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[52ch] text-body-small text-ink-muted">{t("help")}</p>
      <div className="grid max-w-3xl gap-6 sm:grid-cols-3">
        {readings.map((value) => (
          <ArcGauge
            key={value}
            value={value}
            min={0}
            max={100}
            reading={String(value)}
            summary={t("summary", { value, max: 100 })}
            captionKey="catalog.figures.caption"
            scale={["0", "50", "100"]}
          />
        ))}
      </div>
    </div>
  );
}
