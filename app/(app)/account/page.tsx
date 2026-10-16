import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
import { PageSection } from "@/components/patterns/page-section";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { Panel } from "@/components/ui/panel";
import { buttonClasses } from "@/components/ui/styles";
import { catalog } from "@/domain/billing/catalog";
import { currentInstant } from "@/domain/clock";
import { AccessibilityPreferences } from "@/features/account/accessibility-preferences";
import { ApiTokens } from "@/features/account/api-tokens";
import { DeleteAccount } from "@/features/account/delete-account";
import { Devices } from "@/features/account/devices";
import { EmailPreferencesPanel } from "@/features/account/email-preferences";
import { ReferralLink } from "@/features/account/referral-link";
import { ThemePicker } from "@/features/account/theme-picker";
import { LanguageSwitcher } from "@/features/language/language-switcher";
import { FirstSteps } from "@/features/onboarding/first-steps";
import { listApiTokens } from "@/lib/api/tokens";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { isMultilingual } from "@/lib/i18n/locales";
import { formatMoney, toCents } from "@/lib/money";
import { readOnboarding } from "@/lib/onboarding/service";
import { requirePageRole } from "@/lib/page-guard";
import { sessionAccess } from "@/lib/ports/auth";
import { readPreferences } from "@/lib/preferences/service";
import { earnedCredit } from "@/lib/referral/credit";
import { referralSummary } from "@/lib/referral/service";
import { listDeviceSessions } from "@/lib/sessions/service";

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
  await connection();
  const t = await getTranslations("account");
  const user = await requirePageRole("member", "/account");
  // Read fresh: the cached current user can be minutes behind a theme the person just chose.
  const access = await sessionAccess();
  const [preferences, referral, earned, onboarding, steps, devices, tokens] = await Promise.all([
    readPreferences(db, user.id),
    referralSummary(db, user.id),
    earnedCredit(db, user.id),
    readOnboarding(db, user.id),
    getTranslations("onboarding"),
    access.kind === "own"
      ? listDeviceSessions(db, user.id, access.currentId, currentInstant())
      : Promise.resolve([]),
    listApiTokens(db, user.id),
  ]);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} showBack={false} />
      <div className="flex flex-col gap-10">
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

        {onboarding.complete ? null : (
          <PageSection title={steps("title")} help={steps("subtitle")}>
            <FirstSteps progress={onboarding} />
          </PageSection>
        )}

        <PageSection title={t("theme.title")} help={t("theme.help")}>
          <ThemePicker initial={preferences.theme} />
          {isMultilingual ? <LanguageSwitcher /> : null}
        </PageSection>

        <PageSection title={t("accessibility.title")} help={t("accessibility.help")}>
          <AccessibilityPreferences
            initial={{
              fontScale: preferences.fontScale,
              motion: preferences.motion,
              contrast: preferences.contrast,
            }}
          />
        </PageSection>

        <PageSection title={t("referral.title")} help={t("referral.help")}>
          <ReferralLink url={`${env.APP_URL}/?ref=${referral.code}`} />
          <p className="text-body text-ink">{t("referral.count", { count: referral.invited })}</p>
          {earned > 0 ? (
            <p className="text-body text-ink">
              {t("referral.earned", {
                amount: formatMoney(toCents(earned), catalog.currencies.default),
              })}
            </p>
          ) : null}
        </PageSection>

        <PageSection title={t("email.title")}>
          <EmailPreferencesPanel initial={preferences.email} />
        </PageSection>

        {access.kind === "own" || access.url !== null ? (
          <PageSection
            title={t("devices.title")}
            help={access.kind === "own" ? t("devices.help") : undefined}
          >
            {access.kind === "own" ? (
              <Devices
                rows={devices.map((device) => ({
                  ...device,
                  createdAt: device.createdAt.toISOString(),
                }))}
              />
            ) : (
              <>
                <p className="max-w-[52ch] text-body text-ink">{t("devices.external")}</p>
                <a
                  href={access.url ?? ""}
                  rel="noreferrer"
                  className={`${buttonClasses("secondary")} self-start`}
                >
                  {t("devices.externalLink")}
                </a>
              </>
            )}
          </PageSection>
        ) : null}

        <PageSection title={t("apiTokens.title")} help={t("apiTokens.help")}>
          <ApiTokens
            rows={tokens.map((token) => ({
              ...token,
              expiresAt: token.expiresAt?.toISOString() ?? null,
              lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
            }))}
          />
        </PageSection>

        <PageSection title={t("data.title")}>
          <p className="max-w-[52ch] text-body text-ink">{t("data.body")}</p>
          <a href="/account/export" download className={`${buttonClasses("secondary")} self-start`}>
            {t("data.download")}
          </a>
        </PageSection>

        <PageSection title={t("delete.title")}>
          <Panel tone="danger" className="flex flex-col gap-4">
            <p className="max-w-[52ch] text-body text-ink">{t("delete.body")}</p>
            <div className="self-start">
              <DeleteAccount />
            </div>
          </Panel>
        </PageSection>
      </div>
    </>
  );
}
