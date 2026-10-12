import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/patterns/list-states";
import { PageHeader } from "@/components/patterns/page-header";
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

        {onboarding.complete ? null : (
          <Panel className="flex flex-col gap-4">
            <h2 className="text-block-title text-ink">{steps("title")}</h2>
            <p className="max-w-[52ch] text-body-small text-ink-muted">{steps("subtitle")}</p>
            <FirstSteps progress={onboarding} />
          </Panel>
        )}

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
          <h2 className="text-block-title text-ink">{t("referral.title")}</h2>
          <p className="max-w-[52ch] text-body-small text-ink-muted">{t("referral.help")}</p>
          <ReferralLink url={`${env.APP_URL}/?ref=${referral.code}`} />
          <p className="text-body text-ink">{t("referral.count", { count: referral.invited })}</p>
          {earned > 0 ? (
            <p className="text-body text-ink">
              {t("referral.earned", {
                amount: formatMoney(toCents(earned), catalog.currencies.default),
              })}
            </p>
          ) : null}
        </Panel>

        <Panel className="flex flex-col gap-4">
          <h2 className="text-block-title text-ink">{t("email.title")}</h2>
          <EmailPreferencesPanel initial={preferences.email} />
        </Panel>

        {access.kind === "own" || access.url !== null ? (
          <Panel className="flex flex-col gap-4">
            <h2 className="text-block-title text-ink">{t("devices.title")}</h2>
            {access.kind === "own" ? (
              <>
                <p className="max-w-[52ch] text-body-small text-ink-muted">{t("devices.help")}</p>
                <Devices
                  rows={devices.map((device) => ({
                    ...device,
                    createdAt: device.createdAt.toISOString(),
                  }))}
                />
              </>
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
          </Panel>
        ) : null}

        <Panel className="flex flex-col gap-4">
          <h2 className="text-block-title text-ink">{t("apiTokens.title")}</h2>
          <p className="max-w-[52ch] text-body-small text-ink-muted">{t("apiTokens.help")}</p>
          <ApiTokens
            rows={tokens.map((token) => ({
              ...token,
              expiresAt: token.expiresAt?.toISOString() ?? null,
              lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
            }))}
          />
        </Panel>

        <Panel className="flex flex-col gap-4">
          <h2 className="text-block-title text-ink">{t("data.title")}</h2>
          <p className="max-w-[52ch] text-body text-ink">{t("data.body")}</p>
          <a href="/account/export" download className={`${buttonClasses("secondary")} self-start`}>
            {t("data.download")}
          </a>
        </Panel>

        <Panel tone="danger" className="flex flex-col gap-4">
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
