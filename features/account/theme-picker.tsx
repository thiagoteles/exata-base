"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/use-toast";
import { isTheme, ONE_YEAR_SECONDS, THEME_COOKIE, type ThemeChoice } from "@/lib/theme";
import { rememberOption } from "./actions";

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

/**
 * The theme choice. The account page knows what was saved and passes it; on a public page, whose
 * shell is built once for everyone, the choice is read from the page itself after it mounts, which
 * is where the script that runs before the first paint has already put it.
 */
export function ThemePicker({ initial }: { initial?: ThemeChoice }) {
  const t = useTranslations("account.theme");
  const notify = useToast();
  const [value, setValue] = useState<ThemeChoice | null>(initial ?? null);

  useEffect(() => {
    if (initial === undefined) {
      const applied = document.documentElement.getAttribute("data-theme");
      setValue(isTheme(applied) ? applied : SYSTEM);
    }
  }, [initial]);

  if (value === null) {
    return <span className="inline-block h-segment" aria-hidden="true" />;
  }

  const choose = async (next: string) => {
    const previous: ThemeChoice = value;
    const choice: ThemeChoice = isTheme(next) ? next : SYSTEM;
    setValue(choice);
    applyTheme(choice);
    const result = await rememberOption({ key: "theme", value: choice });
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
