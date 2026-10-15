import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/shell/legal-page";
import { buildSocialMetadata } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  return await buildSocialMetadata({ title: t("title"), description: t("notice"), path: "/terms" });
}

export default async function TermsPage() {
  const [t, messages] = await Promise.all([getTranslations("terms"), getMessages()]);
  // Every section the product wrote, in the order it wrote them: the text decides, not this page.
  const written = (
    messages as { terms: { sections: Record<string, { title: string; body: string }> } }
  ).terms.sections;
  const sections = Object.entries(written).map(([key, section]) => ({ key, ...section }));
  return <LegalPage title={t("title")} notice={t("notice")} sections={sections} />;
}
