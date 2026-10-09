"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/use-toast";
import { rememberOption } from "@/lib/preferences/actions";
import type { Preferences } from "@/lib/preferences/definitions";
import { applyPageAttribute } from "./page-attribute";

type Choices = Pick<Preferences, "fontScale" | "motion" | "contrast">;
type Key = keyof Choices;

const options: { [K in Key]: readonly Choices[K][] } = {
  fontScale: ["default", "large", "larger"],
  motion: ["system", "reduce"],
  contrast: ["system", "more"],
};

/**
 * How the page looks to someone who needs it different: the size of the text, the motion and the
 * contrast. A choice shows on this page at once and is saved; if the save fails it goes back.
 */
export function AccessibilityPreferences({ initial }: { initial: Choices }) {
  const t = useTranslations("account.accessibility");
  const notify = useToast();
  const [value, setValue] = useState<Choices>(initial);

  const choose = async (key: Key, next: string) => {
    const previous = value[key];
    setValue({ ...value, [key]: next });
    applyPageAttribute(key, next);
    const result = await rememberOption({ key, value: next });
    if (result?.data === undefined) {
      setValue({ ...value, [key]: previous });
      applyPageAttribute(key, previous);
      notify({ title: t("failed"), tone: "danger" });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {(Object.keys(options) as Key[]).map((key) => (
        <div key={key} className="flex flex-col gap-2">
          <p className="text-field-label text-ink">{t(`${key}.label`)}</p>
          <Segmented
            label={t(`${key}.label`)}
            value={value[key]}
            onValueChange={(next) => choose(key, next)}
            options={options[key].map((option) => ({
              value: option,
              label: t(`${key}.${option}` as never),
            }))}
          />
        </div>
      ))}
    </div>
  );
}
