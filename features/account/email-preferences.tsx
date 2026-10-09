"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import type { EmailPreferences } from "@/domain/email/consent";
import { rememberOption } from "./actions";

/**
 * What the person lets us e-mail beyond what their account needs. Each switch saves at once with
 * both answers together, and goes back if the save fails. Mail about the account itself, such as the
 * confirmation link and receipts, is always sent, which the text under the switches says.
 */
export function EmailPreferencesPanel({ initial }: { initial: EmailPreferences }) {
  const t = useTranslations("account.email");
  const notify = useToast();
  const [value, setValue] = useState<EmailPreferences>(initial);

  const change = async (next: EmailPreferences) => {
    const previous = value;
    setValue(next);
    const result = await rememberOption({ key: "email", value: next });
    if (result?.data === undefined) {
      setValue(previous);
      notify({ title: t("failed"), tone: "danger" });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Switch
        label={t("reminders.label")}
        description={t("reminders.description")}
        checked={value.reminders}
        onCheckedChange={(reminders) => change({ ...value, reminders })}
      />
      <Switch
        label={t("news.label")}
        description={t("news.description")}
        checked={value.news}
        onCheckedChange={(news) => change({ ...value, news })}
      />
      <p className="max-w-[52ch] pt-2 text-body-small text-ink-muted">{t("always")}</p>
    </div>
  );
}
