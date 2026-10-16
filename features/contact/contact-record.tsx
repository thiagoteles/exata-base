import { getTranslations } from "next-intl/server";
import { PageSection } from "@/components/patterns/page-section";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Stamp } from "@/components/ui/stamp";
import type { ContactRow } from "@/lib/contact/service";
import { formatInstantDate } from "@/lib/date";
import { contactStatusTone } from "./presentation";
import { ReplyForm } from "./reply-form";
import { StatusControl } from "./status-control";

/**
 * One message as a filled-in document: the sender, the subject, the date, the state as a stamp,
 * the text, and the answer. The team also gets the controls to work it; the person who wrote it
 * only reads.
 */
export async function ContactRecord({
  message,
  canManage,
  timeZone,
}: {
  message: ContactRow;
  canManage: boolean;
  /** The reader's own, so the dates are the days they lived. */
  timeZone: string;
}) {
  const [t, contact] = await Promise.all([getTranslations("record"), getTranslations("contact")]);
  const answered = message.replyBody !== null;
  return (
    <div className="flex flex-col gap-10">
      <RecordGrid>
        <RecordCell
          label={t("from")}
          stamp={
            <Stamp tone={contactStatusTone[message.status]}>
              {contact(`statuses.${message.status}`)}
            </Stamp>
          }
        >
          {message.name}
        </RecordCell>
        <RecordCell label={t("email")}>{message.email}</RecordCell>
        <RecordCell label={t("subject")}>{contact(`subjects.${message.subject}`)}</RecordCell>
        <RecordCell label={t("received")}>
          <span className="font-mono text-data tabular-nums">
            {formatInstantDate(message.createdAt, timeZone)}
          </span>
        </RecordCell>
        <RecordCell label={t("message")} wide>
          <span className="whitespace-pre-wrap">{message.body}</span>
        </RecordCell>
      </RecordGrid>

      <PageSection title={t("replyTitle")}>
        {answered && message.answeredAt !== null ? (
          <div className="flex flex-col gap-3">
            <p className="max-w-[68ch] whitespace-pre-wrap text-body text-ink">
              {message.replyBody}
            </p>
            <p className="text-body-small text-ink-muted">
              {t("answeredBy", {
                name: message.answeredByEmail ?? t("unknownPerson"),
                date: formatInstantDate(message.answeredAt, timeZone),
              })}
            </p>
          </div>
        ) : (
          <p className="text-body text-ink-muted">{t("noReplyYet")}</p>
        )}
      </PageSection>

      {canManage ? (
        <div className="print:hidden">
          <PageSection title={t("manage")}>
            <div className="flex flex-col gap-6">
              <StatusControl id={message.id} status={message.status} />
              {answered ? null : <ReplyForm id={message.id} email={message.email} />}
            </div>
          </PageSection>
        </div>
      ) : null}
    </div>
  );
}
