import { getTranslations } from "next-intl/server";
import { PageSection } from "@/components/patterns/page-section";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Stamp } from "@/components/ui/stamp";
import type { EmailDestination } from "@/lib/ports/email";
import { EmailCheck } from "./email-check";

export type EmailSetup = { destination: EmailDestination; from: string; to: string };

/** Where e-mail goes and from which address, with the button that proves it reaches an inbox. */
export async function EmailSection({ destination, from, to }: EmailSetup) {
  const t = await getTranslations("admin.health");
  return (
    <PageSection title={t("email.title")} help={t("email.note", { to })}>
      <div className="flex flex-col gap-6">
        <RecordGrid aria-label={t("email.title")}>
          <RecordCell
            label={t("email.destination")}
            stamp={
              <Stamp tone={destination.kind === "none" ? "danger" : "success"}>
                {t(`email.kinds.${destination.kind}`)}
              </Stamp>
            }
            wide
          >
            {destination.kind === "smtp" ? (
              <span className="font-mono">
                {destination.host}:{destination.port}
              </span>
            ) : (
              <span className="text-ink-muted">{t(`email.where.${destination.kind}`)}</span>
            )}
          </RecordCell>
          <RecordCell label={t("email.sender")}>
            <span className="font-mono break-all">{from}</span>
          </RecordCell>
        </RecordGrid>
        <EmailCheck />
      </div>
    </PageSection>
  );
}
