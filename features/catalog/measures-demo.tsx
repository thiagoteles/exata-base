"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Meter } from "@/components/ui/meter";
import { Progress } from "@/components/ui/progress";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";

/** A bar going somewhere, a reading that just is, a slider alone and as a range, and ghost content. */
export function MeasuresDemo() {
  const t = useTranslations("catalog.measures");
  const [volume, setVolume] = useState([40]);
  const [range, setRange] = useState([20, 70]);
  return (
    <div className="grid max-w-3xl gap-10 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Progress label={t("upload")} value={volume[0] ?? 0} showValue />
        <Progress label={t("compact")} size="sm" value={72} />
        <Progress label={t("failing")} tone="danger" value={34} />
        <div className="flex flex-col gap-1.5">
          <p className="text-body-small text-ink">{t("storage")}</p>
          <Meter
            label={t("storage")}
            value={6.2}
            max={10}
            high={8}
            valueText={t("storageText", { used: 6.2, total: 10 })}
          />
          <p className="text-body-small text-ink-muted">
            {t("storageText", { used: 6.2, total: 10 })}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-body-small text-ink">{t("quota")}</p>
          <Meter
            label={t("quota")}
            size="sm"
            value={9.1}
            max={10}
            high={8}
            valueText={t("quotaText")}
          />
          <p className="text-body-small text-warning-ink">{t("quotaText")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-field-label text-ink">{t("volume")}</p>
          <Slider label={t("volume")} value={volume} onValueChange={setVolume} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-field-label text-ink">{t("range")}</p>
          <Slider
            label={t("range")}
            size="sm"
            tone="danger"
            value={range}
            onValueChange={setRange}
            thumbLabels={[t("from"), t("until")]}
          />
          <p className="tabular-nums text-body-small text-ink-muted">
            {t("rangeText", { from: range[0] ?? 0, until: range[1] ?? 0 })}
          </p>
        </div>
        <SkeletonGroup label={t("loading")}>
          <div className="flex items-center gap-3">
            <Skeleton shape="circle" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="w-1/2" />
              <Skeleton size="sm" className="w-1/3" />
            </div>
          </div>
          <Skeleton shape="block" />
        </SkeletonGroup>
      </div>
    </div>
  );
}
