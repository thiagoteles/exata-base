import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";

export function StatesDemo() {
  const t = useTranslations("catalog.states");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Stamp tone="done">{t("done")}</Stamp>
        <Stamp tone="progress">{t("progress")}</Stamp>
        <Stamp tone="attention">{t("attention")}</Stamp>
        <Stamp tone="refused">{t("refused")}</Stamp>
        <Stamp tone="neutral">{t("neutral")}</Stamp>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Panel>{t("panelDefault")}</Panel>
        <Panel level="highlight">{t("panelHighlight")}</Panel>
        <Panel level="danger">{t("panelDanger")}</Panel>
      </div>
    </div>
  );
}
