import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Stamp } from "@/components/ui/stamp";
import { formatInstantDate } from "@/lib/date";
import type { SamplePartView } from "@/lib/sample-parts/records";
import { samplePartParentHref, samplePartStatusTone, showDate } from "./presentation";

type SamplePartRecordProps = {
  item: SamplePartView;
  timeZone: string;
  locale: string;
};

/** One record as a filled-in document. */
export async function SamplePartRecord({ item, timeZone, locale }: SamplePartRecordProps) {
  const t = await getTranslations("sampleParts");
  const none = <span className="text-ink-muted">{t("record.none")}</span>;
  const mono = (value: string | null) =>
    value === null ? none : <span className="font-mono text-data tabular-nums">{value}</span>;
  return (
    <div className="flex flex-col gap-10">
      <RecordGrid>
        <RecordCell label={t("record.parent")} wide>
          <Link
            href={samplePartParentHref(item.sampleItemId)}
            className="text-brand-ink underline decoration-line-strong underline-offset-4 hover:decoration-brand"
          >
            {item.parentName}
          </Link>
        </RecordCell>
        <RecordCell
          label={t("record.code")}
          stamp={
            <Stamp tone={samplePartStatusTone[item.status]}>{t(`statuses.${item.status}`)}</Stamp>
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
