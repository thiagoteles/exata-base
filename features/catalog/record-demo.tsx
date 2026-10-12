import { IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Figure, RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import type { IsoDate } from "@/lib/date";
import { formatDate } from "@/lib/date";
import { maskCpf } from "@/lib/masks";

const created = "2026-03-14" as IsoDate;
const customerName = "Ana Souza";
const currencyMark = "R$";
const totalText = "1.234,56";

export function RecordDemo() {
  const t = useTranslations("catalog");
  return (
    <div className="flex flex-col gap-6">
      <RecordGrid>
        <RecordCell
          label={t("record.customer")}
          stamp={<Stamp tone="success">{t("statuses.paid")}</Stamp>}
        >
          {customerName}
        </RecordCell>
        <RecordCell label={t("record.document")}>
          <span className="font-mono text-data tabular-nums">{maskCpf("52998224725")}</span>
        </RecordCell>
        <RecordCell label={t("record.created")}>
          <span className="font-mono text-data tabular-nums">{formatDate(created)}</span>
        </RecordCell>
        <RecordCell label={t("record.total")}>
          <Figure prefix={currencyMark}>{totalText}</Figure>
        </RecordCell>
        <RecordCell label={t("record.note")} wide>
          {t("record.noteValue")}
        </RecordCell>
      </RecordGrid>
      <Panel tone="danger" className="flex flex-col gap-3">
        <h3 className="text-block-title">{t("record.dangerTitle")}</h3>
        <p className="text-body">{t("record.dangerBody")}</p>
        <Button
          tone="danger"
          className="self-start"
          icon={<IconTrash className="size-5" aria-hidden="true" />}
        >
          {t("record.dangerTitle")}
        </Button>
      </Panel>
    </div>
  );
}
