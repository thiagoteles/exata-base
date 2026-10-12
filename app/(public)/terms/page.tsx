import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/shell/legal-page";
import { buildSocialMetadata } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  return await buildSocialMetadata({ title: t("title"), description: t("notice"), path: "/terms" });
}

export default async function TermsPage() {
  const t = await getTranslations("terms");
  const sections = (["service", "account", "payment", "changes"] as const).map((key) => ({
    key,
    title: t(`sections.${key}.title`),
    body: t(`sections.${key}.body`),
  }));
  return <LegalPage title={t("title")} notice={t("notice")} sections={sections} />;
}
