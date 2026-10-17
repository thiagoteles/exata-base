import { useTranslations } from "next-intl";
import { ListEmpty, SectionEmpty } from "@/components/patterns/list-states";
import { Button } from "@/components/ui/button";
import { Stamp, type StampTone } from "@/components/ui/stamp";
import { formatDate, type IsoDate } from "@/lib/date";
import { formatBRL, toCents } from "@/lib/money";

const preview = [
  ["first", "paid", 128_000, "2026-10-12"],
  ["second", "progress", 64_050, "2026-10-08"],
  ["third", "new", 21_590, "2026-10-02"],
] as const;

const tones: Record<(typeof preview)[number][1], StampTone> = {
  paid: "success",
  progress: "info",
  new: "neutral",
};

/** An empty list with the rows it will hold beside it, and an empty part of a page. */
export function EmptyDemo() {
  const t = useTranslations("catalog");
  return (
    <div className="flex flex-col gap-8">
      <ListEmpty
        title={t("empty.listTitle")}
        body={t("empty.listBody")}
        action={<Button>{t("empty.listAction")}</Button>}
        secondary={<Button variant="secondary">{t("empty.listSecondary")}</Button>}
        preview={preview.map(([key, status, amount, day]) => ({
          key,
          title: t(`empty.preview.${key}`),
          details: [formatBRL(toCents(amount)), formatDate(day as IsoDate)],
          stamp: <Stamp tone={tones[status]}>{t(`statuses.${status}`)}</Stamp>,
        }))}
      />
      <SectionEmpty
        title={t("empty.sectionTitle")}
        body={t("empty.sectionBody")}
        action={<Button variant="secondary">{t("empty.sectionAction")}</Button>}
      />
    </div>
  );
}
