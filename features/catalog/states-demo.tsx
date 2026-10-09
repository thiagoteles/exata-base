import { useTranslations } from "next-intl";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";

export function StatesDemo() {
  const t = useTranslations("catalog.states");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Stamp tone="success">{t("done")}</Stamp>
        <Stamp tone="info">{t("progress")}</Stamp>
        <Stamp tone="warning">{t("attention")}</Stamp>
        <Stamp tone="danger">{t("refused")}</Stamp>
        <Stamp tone="neutral">{t("neutral")}</Stamp>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Panel>{t("panelDefault")}</Panel>
        <Panel tone="info">{t("panelHighlight")}</Panel>
        <Panel tone="danger">{t("panelDanger")}</Panel>
      </div>
    </div>
  );
}
