import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/shell/legal-page";
import { buildSocialMetadata } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return await buildSocialMetadata({
    title: t("title"),
    description: t("notice"),
    path: "/privacy",
  });
}

export default async function PrivacyPage() {
  const [t, messages] = await Promise.all([getTranslations("privacy"), getMessages()]);
  // Every section the product wrote, in the order it wrote them: the text decides, not this page.
  const written = (
    messages as { privacy: { sections: Record<string, { title: string; body: string }> } }
  ).privacy.sections;
  const sections = Object.entries(written).map(([key, section]) => ({ key, ...section }));
  return <LegalPage title={t("title")} notice={t("notice")} sections={sections} />;
}
