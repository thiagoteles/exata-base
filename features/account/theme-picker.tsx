"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/use-toast";
import { isTheme, ONE_YEAR_SECONDS, THEME_COOKIE, type Theme } from "@/lib/theme";
import { setTheme } from "./actions";

const SYSTEM = "system";

/** Applies a theme at once: the attribute for this page, and the cookie for the next first paint. */
function applyTheme(theme: Theme | null) {
  const root = document.documentElement;
  if (theme === null) {
    root.removeAttribute("data-theme");
    // biome-ignore lint/suspicious/noDocumentCookie: the theme cookie is read by the script before the first paint
    document.cookie = `${THEME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  root.setAttribute("data-theme", theme);
  // biome-ignore lint/suspicious/noDocumentCookie: the theme cookie is read by the script before the first paint
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function ThemePicker({ initial }: { initial: Theme | null }) {
  const t = useTranslations("account.theme");
  const notify = useToast();
  const [value, setValue] = useState<string>(initial ?? SYSTEM);

  const choose = async (next: string) => {
    const previous = value;
    const theme = isTheme(next) ? next : null;
    setValue(next);
    applyTheme(theme);
    const result = await setTheme({ theme });
    if (result?.data === undefined) {
      setValue(previous);
      applyTheme(isTheme(previous) ? previous : null);
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
