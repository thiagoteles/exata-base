"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { rememberOption } from "@/lib/preferences/actions";
import { isTheme, type Theme, type ThemeChoice } from "@/lib/theme";
import { applyPageAttribute } from "./page-attribute";

/** The theme on screen: the one chosen, or the system's when nothing was. */
function themeOnScreen(): Theme {
  const chosen = document.documentElement.getAttribute("data-theme");
  if (isTheme(chosen)) {
    return chosen;
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * The dark theme switch without its look: whether it is on (null until mounted), the label for the
 * control, and the flip, which saves the choice and puts the old theme back if saving fails. A
 * product that draws its own button uses this, so the behaviour stays the base's.
 */
export function useThemeToggle(): {
  dark: boolean | null;
  label: string;
  flip: () => Promise<void>;
} {
  const t = useTranslations("account.theme");
  const notify = useToast();
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(themeOnScreen() === "dark");
  }, []);

  const flip = async () => {
    const previous = document.documentElement.getAttribute("data-theme");
    const next: Theme = themeOnScreen() === "dark" ? "light" : "dark";
    setDark(next === "dark");
    applyPageAttribute("theme", next);
    const result = await rememberOption({ key: "theme", value: next });
    if (result?.data === undefined) {
      const restored: ThemeChoice = isTheme(previous) ? previous : "system";
      applyPageAttribute("theme", restored);
      setDark(themeOnScreen() === "dark");
      notify({ title: t("failed"), tone: "danger" });
    }
  };

  return { dark, label: t("toggle"), flip };
}
