"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
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

/*
 * One button in the top bar that turns the dark theme on or off. The icon follows the theme in CSS,
 * so it is right before any script runs; the pressed state is read from the page once it mounts.
 * The finer choice, "follow the system", stays with the theme picker.
 */
export function ThemeToggle() {
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

  return (
    <button
      type="button"
      aria-label={t("toggle")}
      aria-pressed={dark ?? undefined}
      onClick={flip}
      className="inline-flex size-control shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors duration-120 ease-enter hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-coarse:size-control-coarse"
    >
      <IconMoon aria-hidden="true" className="size-[1.25rem] dark:hidden" stroke={1.75} />
      <IconSun aria-hidden="true" className="hidden size-[1.25rem] dark:block" stroke={1.75} />
    </button>
  );
}
