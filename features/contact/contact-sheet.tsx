import { getTranslations } from "next-intl/server";
import { NoBreak, Sheet, SheetFooter, SheetHeader } from "@/components/print/sheet";
import type { ContactRow } from "@/lib/contact/service";
import { formatInstantDate } from "@/lib/date";

/**
 * One message as a sheet to print: the same facts as the record on screen, in the order a person
 * reads a filled-in form, with who answered and when. It takes the row the record screen reads, so
 * what is printed is exactly what the guard let the reader see.
 */
export async function ContactSheet({
  message,
  timeZone,
  printedOn,
}: {
  message: ContactRow;
  timeZone: string;
  printedOn: Date;
}) {
  const [t, record, contact, site] = await Promise.all([
    getTranslations("print.contact"),
    getTranslations("record"),
    getTranslations("contact"),
    getTranslations("site"),
  ]);
  const fields = [
    [record("from"), message.name],
    [record("email"), message.email],
    [record("subject"), contact(`subjects.${message.subject}`)],
    [record("received"), formatInstantDate(message.createdAt, timeZone)],
    [record("status"), contact(`statuses.${message.status}`)],
  ] as const;
  return (
    <Sheet>
      <SheetHeader
        brand={site("name")}
        title={t("title")}
        date={formatInstantDate(printedOn, timeZone)}
      />
      <dl className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3">
        {fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-label text-ink-muted">{label}</dt>
            <dd className="text-body text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <section>
        <h2 className="mb-2 break-after-avoid text-block-title text-ink">{record("message")}</h2>
        <p className="whitespace-pre-wrap text-body text-ink">{message.body}</p>
      </section>
      <NoBreak>
        <h2 className="mb-2 text-block-title text-ink">{record("replyTitle")}</h2>
        {message.replyBody !== null && message.answeredAt !== null ? (
          <>
            <p className="whitespace-pre-wrap text-body text-ink">{message.replyBody}</p>
            <p className="mt-2 text-body-small text-ink-muted">
              {record("answeredBy", {
                name: message.answeredByEmail ?? record("unknownPerson"),
                date: formatInstantDate(message.answeredAt, timeZone),
              })}
            </p>
          </>
        ) : (
          <p className="text-body text-ink-muted">{record("noReplyYet")}</p>
        )}
      </NoBreak>
      <SheetFooter>{t("footer", { number: message.id.slice(0, 8).toUpperCase() })}</SheetFooter>
    </Sheet>
  );
}
