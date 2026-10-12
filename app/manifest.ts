import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { emailPalette } from "@/emails/palette";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("site");
  return {
    name: t("name"),
    short_name: t("name"),
    description: t("description"),
    start_url: "/",
    display: "standalone",
    background_color: emailPalette.background,
    theme_color: emailPalette.background,
  };
}
