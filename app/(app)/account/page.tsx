import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { productAccountPage } from "@/components/pages.product";
import { ListSkeleton } from "@/components/patterns/list-states";
import { RecordCell, RecordGrid } from "@/components/patterns/record-grid";
import { type PageSectionEntry, SectionedPage } from "@/components/patterns/sectioned-page";
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
import { SecondFactorPanel } from "@/features/account/two-factor";
import { LanguageSwitcher } from "@/features/language/language-switcher";
import { FirstSteps } from "@/features/onboarding/first-steps";
import { listApiTokens } from "@/lib/api/tokens";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
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
    <div className={productAccountPage === null ? "mx-auto w-full max-w-270" : undefined}>
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
  const [preferences, referral, earned, onboarding, steps, devices, tokens, factor] =
    await Promise.all([
      readPreferences(db, user.id),
      referralSummary(db, user.id),
      earnedCredit(db, user.id),
      readOnboarding(db, user.id),
      getTranslations("onboarding"),
      access.kind === "own"
        ? listDeviceSessions(db, user.id, access.currentId, currentInstant())
        : Promise.resolve([]),
      listApiTokens(db, user.id),
      env.AUTH_PROVIDER === "local"
        ? db
            .select({ twoFactorEnabled: users.twoFactorEnabled })
            .from(users)
            .where(eq(users.id, user.id))
        : Promise.resolve([]),
    ]);
  const data: AccountData = {
    user,
    access,
    preferences,
    referral,
    earned,
    onboarding,
    devices,
    tokens,
    twoFactor: factor[0]?.twoFactorEnabled === true,
  };
  const sections = [
    ...profileSections(data, t, steps),
    ...securitySections(data, t),
    ...dataSections(data, t),
  ];
  const Page = productAccountPage ?? SectionedPage;
  return <Page title={t("title")} subtitle={t("subtitle")} sections={sections} />;
}

type AccountTranslator = Awaited<ReturnType<typeof getTranslations<"account">>>;

/** What the account page read, handed to the functions that draw its sections. */
type AccountData = {
  user: Awaited<ReturnType<typeof requirePageRole>>;
  access: Awaited<ReturnType<typeof sessionAccess>>;
  preferences: Awaited<ReturnType<typeof readPreferences>>;
  referral: Awaited<ReturnType<typeof referralSummary>>;
  earned: number;
  onboarding: Awaited<ReturnType<typeof readOnboarding>>;
  devices: Awaited<ReturnType<typeof listDeviceSessions>>;
  tokens: Awaited<ReturnType<typeof listApiTokens>>;
  twoFactor: boolean;
};

/** Who the person is, how the app looks for them, and the link that invites others. */
function profileSections(
  { user, preferences, referral, earned, onboarding }: AccountData,
  t: AccountTranslator,
  steps: Awaited<ReturnType<typeof getTranslations<"onboarding">>>,
): PageSectionEntry[] {
  return [
    {
      key: "profile",
      title: null,
      parts: {
        name: user.name.trim() || t("profile.noName"),
        email: user.email,
        role: t(`roles.${user.role}`),
        timeZone: preferences.timeZone,
      },
      content: (
        // Four cells fill two columns exactly; three columns would leave a gap in the second row.
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
      ),
    },
    ...(onboarding.complete
      ? []
      : [
          {
            key: "firstSteps",
            title: steps("title"),
            help: steps("subtitle"),
            content: <FirstSteps progress={onboarding} />,
          },
        ]),
    {
      key: "theme",
      title: t("theme.title"),
      help: t("theme.help"),
      content: (
        <>
          <ThemePicker initial={preferences.theme} />
          {isMultilingual ? <LanguageSwitcher /> : null}
        </>
      ),
    },
    {
      key: "accessibility",
      title: t("accessibility.title"),
      help: t("accessibility.help"),
      content: (
        <AccessibilityPreferences
          initial={{
            fontScale: preferences.fontScale,
            motion: preferences.motion,
            contrast: preferences.contrast,
          }}
        />
      ),
    },
    {
      key: "referral",
      title: t("referral.title"),
      help: t("referral.help"),
      content: (
        <>
          <ReferralLink url={`${env.APP_URL}/?ref=${referral.code}`} />
          <p className="text-body text-ink">{t("referral.count", { count: referral.invited })}</p>
          {earned > 0 ? (
            <p className="text-body text-ink">
              {t("referral.earned", {
                amount: formatMoney(toCents(earned), catalog.currencies.default),
              })}
            </p>
          ) : null}
        </>
      ),
    },
  ];
}

/** The e-mails the person gets, the second factor and the devices signed in. */
function securitySections(
  { preferences, access, devices, twoFactor }: AccountData,
  t: AccountTranslator,
): PageSectionEntry[] {
  return [
    {
      key: "email",
      title: t("email.title"),
      content: <EmailPreferencesPanel initial={preferences.email} />,
    },
    ...(env.AUTH_PROVIDER === "local"
      ? [
          {
            key: "secondFactor",
            title: t("secondFactor.title"),
            help: t("secondFactor.help"),
            content: <SecondFactorPanel enabled={twoFactor} />,
          },
        ]
      : []),
    ...(access.kind === "own" || access.url !== null
      ? [
          {
            key: "devices",
            title: t("devices.title"),
            help: access.kind === "own" ? t("devices.help") : undefined,
            content:
              access.kind === "own" ? (
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
              ),
          },
        ]
      : []),
  ];
}

/** The keys for the API, the person's data to download, and the way to delete the account. */
function dataSections({ tokens }: AccountData, t: AccountTranslator): PageSectionEntry[] {
  const exportLink = (
    <a href="/account/export" download className={`${buttonClasses("secondary")} self-start`}>
      {t("data.download")}
    </a>
  );
  return [
    {
      key: "apiTokens",
      title: t("apiTokens.title"),
      help: t("apiTokens.help"),
      content: (
        <ApiTokens
          rows={tokens.map((token) => ({
            ...token,
            expiresAt: token.expiresAt?.toISOString() ?? null,
            lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
          }))}
        />
      ),
    },
    {
      key: "data",
      title: t("data.title"),
      parts: { body: t("data.body"), action: exportLink },
      content: (
        <>
          <p className="max-w-[52ch] text-body text-ink">{t("data.body")}</p>
          {exportLink}
        </>
      ),
    },
    {
      key: "delete",
      title: t("delete.title"),
      parts: { body: t("delete.body"), action: <DeleteAccount /> },
      content: (
        <Panel tone="danger" className="flex flex-col gap-4">
          <p className="max-w-[52ch] text-body text-ink">{t("delete.body")}</p>
          <div className="self-start">
            <DeleteAccount />
          </div>
        </Panel>
      ),
    },
  ];
}
