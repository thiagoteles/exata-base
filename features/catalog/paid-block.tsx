import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Gate } from "@/components/patterns/gate";
import { Panel } from "@/components/ui/panel";
import { Stamp } from "@/components/ui/stamp";
import { buttonClasses } from "@/components/ui/styles";
import { hasFeature } from "@/lib/billing/guard";
import { publicHref } from "@/lib/i18n/public-paths";

/** A block that only a paid plan opens, to show the gate at work. Everyone else sees the paywall. */
export async function PaidBlock() {
  const [t, p] = await Promise.all([
    getTranslations("catalog.paid"),
    getTranslations("plans.paywall"),
  ]);
  return (
    <Gate
      open={await hasFeature("premium")}
      source="catalog"
      label={p("label")}
      closed={{
        title: t("closedTitle"),
        body: t("locked"),
        benefits: [t("benefits.one"), t("benefits.two")],
      }}
      action={
        <Link href={publicHref("/plans")} className={buttonClasses("secondary")}>
          {p("action")}
        </Link>
      }
    >
      <Panel tone="info" className="flex flex-col items-start gap-4">
        <Stamp tone="success">{t("unlockedStamp")}</Stamp>
        <p className="max-w-[52ch] text-body text-ink">{t("unlocked")}</p>
      </Panel>
    </Gate>
  );
}
