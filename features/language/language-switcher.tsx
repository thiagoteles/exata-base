"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { locales } from "@/lib/i18n/locales";
import { pathInLocale, stripLocalePrefix } from "@/lib/i18n/negotiate";
import { setLanguage } from "./actions";

/** Each language is named in itself, so a person who cannot read the current one still finds theirs. */
const nameOf = (locale: string) =>
  new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale;

/**
 * Chooses the language. It is shown only when the product has more than one. The choice is saved,
 * then the same page is opened in the new language.
 */
export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const current = useLocale();
  const pathname = usePathname();
  const notify = useToast();
  const [value, setValue] = useState<string>(current);

  const change = async (next: string) => {
    const locale = locales.find((candidate) => candidate === next);
    if (locale === undefined) {
      return;
    }
    setValue(next);
    const result = await setLanguage({ locale });
    if (result?.data === undefined) {
      setValue(current);
      notify({ title: t("language"), tone: "danger" });
      return;
    }
    globalThis.location.assign(
      `${pathInLocale(stripLocalePrefix(pathname), locale)}${globalThis.location.search}`,
    );
  };

  return (
    <Field label={t("language")} className="w-full md:w-64">
      {(control) => (
        <Select
          {...control}
          options={locales.map((locale) => ({ value: locale, label: nameOf(locale) }))}
          value={value}
          onValueChange={change}
          placeholder={t("language")}
        />
      )}
    </Field>
  );
}
