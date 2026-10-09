"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/use-toast";
import { isTheme, ONE_YEAR_SECONDS, THEME_COOKIE, type ThemeChoice } from "@/lib/theme";
import { saveOption } from "./actions";

const SYSTEM = "system";

/** Applies a theme at once: the attribute for this page, and the cookie for the next first paint. */
function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  if (!isTheme(theme)) {
    root.removeAttribute("data-theme");
    // biome-ignore lint/suspicious/noDocumentCookie: the theme cookie is read by the script before the first paint
    document.cookie = `${THEME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  root.setAttribute("data-theme", theme);
  // biome-ignore lint/suspicious/noDocumentCookie: the theme cookie is read by the script before the first paint
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function ThemePicker({ initial }: { initial: ThemeChoice }) {
  const t = useTranslations("account.theme");
  const notify = useToast();
  const [value, setValue] = useState<ThemeChoice>(initial);

  const choose = async (next: string) => {
    const previous = value;
    const choice: ThemeChoice = isTheme(next) ? next : SYSTEM;
    setValue(choice);
    applyTheme(choice);
    const result = await saveOption({ key: "theme", value: choice });
    if (result?.data === undefined) {
      setValue(previous);
      applyTheme(previous);
      notify({ title: t("failed"), tone: "danger" });
    }
  };

  return (
    <Segmented
      label={t("label")}
      value={value}
      onValueChange={choose}
      options={[
        { value: SYSTEM, label: t("system") },
        { value: "light", label: t("light") },
        { value: "dark", label: t("dark") },
      ]}
    />
  );
}
