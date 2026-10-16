import { getTranslations } from "next-intl/server";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Stamp } from "@/components/ui/stamp";
import { formatInstantDate } from "@/lib/date";
import type { SampleItemRow } from "@/lib/sample-items/records";
import { sampleItemStatusTone, showDate } from "./presentation";

type SampleItemRecordProps = {
  item: SampleItemRow;
  timeZone: string;
  locale: string;
};

/** One record as a filled-in document. */
export async function SampleItemRecord({ item, timeZone, locale }: SampleItemRecordProps) {
  const t = await getTranslations("sampleItems");
  const none = <span className="text-ink-muted">{t("record.none")}</span>;
  const mono = (value: string | null) =>
    value === null ? none : <span className="font-mono text-data tabular-nums">{value}</span>;
  return (
    <div className="flex flex-col gap-10">
      <RecordGrid>
        <RecordCell
          label={t("record.code")}
          stamp={
            <Stamp tone={sampleItemStatusTone[item.status]}>{t(`statuses.${item.status}`)}</Stamp>
          }
        >
          {mono(item.code)}
        </RecordCell>
        <RecordCell label={t("record.dueDate")}>{mono(showDate(item.dueDate, locale))}</RecordCell>
        <RecordCell label={t("record.since")}>
          {mono(formatInstantDate(item.createdAt, timeZone, locale))}
        </RecordCell>
        {item.notes === null ? null : (
          <RecordCell label={t("record.notes")} wide>
            <span className="whitespace-pre-wrap">{item.notes}</span>
          </RecordCell>
        )}
      </RecordGrid>
    </div>
  );
}
