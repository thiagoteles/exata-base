import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { requireFeature } from "@/lib/billing/guard";
import { DomainError } from "@/lib/errors";

/** A block that only a paid plan opens, to show the guard at work. Everyone else sees why not. */
export async function PaidBlock() {
  const t = await getTranslations("catalog.paid");
  try {
    await requireFeature("premium");
  } catch (error) {
    if (error instanceof DomainError && error.status === 403) {
      return (
        <Panel className="flex flex-col items-start gap-4">
          <Stamp tone="neutral">{t("lockedStamp")}</Stamp>
          <p className="max-w-[52ch] text-body text-ink">{t("locked")}</p>
          <Link href="/plans" className={buttonClasses("secondary")}>
            {t("plans")}
          </Link>
        </Panel>
      );
    }
    throw error;
  }
  return (
    <Panel level="highlight" className="flex flex-col items-start gap-4">
      <Stamp tone="done">{t("unlockedStamp")}</Stamp>
      <p className="max-w-[52ch] text-body text-ink">{t("unlocked")}</p>
    </Panel>
  );
}
