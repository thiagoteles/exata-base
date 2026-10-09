"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/use-toast";
import { isTheme, type ThemeChoice } from "@/lib/theme";
import { rememberOption } from "./actions";
import { applyPageAttribute } from "./page-attribute";

const SYSTEM = "system";

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
    applyPageAttribute("theme", choice);
    const result = await rememberOption({ key: "theme", value: choice });
    if (result?.data === undefined) {
      setValue(previous);
      applyPageAttribute("theme", previous);
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
