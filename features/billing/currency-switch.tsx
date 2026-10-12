"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/use-toast";
import { rememberOption } from "@/lib/preferences/actions";

/**
 * Chooses the currency prices are shown in. It is only drawn when the product offers more than one.
 * The choice is remembered like any preference, then the page is read again in the new currency.
 */
export function CurrencySwitch({
  current,
  options,
}: {
  current: string;
  options: readonly string[];
}) {
  const t = useTranslations("plans.currency");
  const router = useRouter();
  const notify = useToast();
  const [value, setValue] = useState(current);

  const change = async (next: string) => {
    const previous = value;
    setValue(next);
    const result = await rememberOption({ key: "currency", value: next });
    if (result?.data === undefined) {
      setValue(previous);
      notify({ title: t("failed"), tone: "danger" });
      return;
    }
    router.refresh();
  };

  return (
    <Segmented
      label={t("label")}
      value={value}
      onValueChange={change}
      options={options.map((code) => ({ value: code, label: code.toUpperCase() }))}
    />
  );
}
