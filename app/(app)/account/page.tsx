import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Panel } from "@/components/ui/panel";
import { buttonClasses } from "@/components/ui/styles";
import { AccessibilityPreferences } from "@/features/account/accessibility-preferences";
import { DeleteAccount } from "@/features/account/delete-account";
import { EmailPreferencesPanel } from "@/features/account/email-preferences";
import { ThemePicker } from "@/features/account/theme-picker";
import { LanguageSwitcher } from "@/features/language/language-switcher";
import { db } from "@/lib/db/client";
import { isMultilingual } from "@/lib/i18n/locales";
import { requirePageRole } from "@/lib/page-guard";
import { readPreferences } from "@/lib/preferences/service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title"), robots: { index: false } };
}

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-270">
      <Suspense fallback={<ListSkeleton label="" rows={4} />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}

async function AccountContent() {
  const t = await getTranslations("account");
  const user = await requirePageRole("member", "/account");
  // Read fresh: the cached current user can be minutes behind a theme the person just chose.
  const preferences = await readPreferences(db, user.id);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <div className="flex flex-col gap-8">
        {/* Four cells fill two columns exactly; three columns would leave a gap in the second row. */}
        <RecordGrid className="md:grid-cols-2 xl:grid-cols-2">
          <RecordCell label={t("profile.name")}>
            {user.name.trim() || t("profile.noName")}
          </RecordCell>
          <RecordCell label={t("profile.email")}>{user.email}</RecordCell>
          <RecordCell label={t("profile.role")}>{t(`roles.${user.role}`)}</RecordCell>
          <RecordCell label={t("profile.timeZone")}>
            <span className="font-mono text-data">{preferences.timeZone}</span>
          </RecordCell>
        </RecordGrid>

        <Panel className="flex flex-col gap-4">
          <h2 className="text-block-title text-ink">{t("theme.title")}</h2>
          <ThemePicker initial={preferences.theme} />
          <p className="max-w-[52ch] text-body-small text-ink-muted">{t("theme.help")}</p>
          {isMultilingual ? <LanguageSwitcher /> : null}
        </Panel>

        <Panel className="flex flex-col gap-4">
          <h2 className="text-block-title text-ink">{t("accessibility.title")}</h2>
          <AccessibilityPreferences
            initial={{
              fontScale: preferences.fontScale,
              motion: preferences.motion,
              contrast: preferences.contrast,
            }}
          />
          <p className="max-w-[52ch] text-body-small text-ink-muted">{t("accessibility.help")}</p>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <h2 className="text-block-title text-ink">{t("email.title")}</h2>
          <EmailPreferencesPanel initial={preferences.email} />
        </Panel>

        <Panel className="flex flex-col gap-4">
          <h2 className="text-block-title text-ink">{t("data.title")}</h2>
          <p className="max-w-[52ch] text-body text-ink">{t("data.body")}</p>
          <a href="/account/export" download className={`${buttonClasses("secondary")} self-start`}>
            {t("data.download")}
          </a>
        </Panel>

        <Panel level="danger" className="flex flex-col gap-4">
          <h2 className="text-block-title text-ink">{t("delete.title")}</h2>
          <p className="max-w-[52ch] text-body text-ink">{t("delete.body")}</p>
          <div className="self-start">
            <DeleteAccount />
          </div>
        </Panel>
      </div>
    </>
  );
}
