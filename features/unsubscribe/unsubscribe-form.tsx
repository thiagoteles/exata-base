"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useErrorText } from "@/lib/use-error-text";
import { confirmUnsubscribe } from "./actions";

type UnsubscribeFormProps = {
  token: string;
  address: string;
  category: "reminder" | "news";
};

/** One question and one button: stop this kind of mail for this address. It says what happened after. */
export function UnsubscribeForm({ token, address, category }: UnsubscribeFormProps) {
  const t = useTranslations("unsubscribe");
  const describe = useErrorText();
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setFailure(undefined);
    const result = await confirmUnsubscribe({ token });
    setBusy(false);
    if (result?.data === undefined) {
      setFailure(describe(result?.serverError));
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <Panel tone="info" role="status" className="flex flex-col gap-2">
        <p className="text-body text-ink">{t(`done.${category}`, { address })}</p>
        <p className="text-body-small text-ink-muted">{t("changeLater")}</p>
      </Panel>
    );
  }
  return (
    <Panel className="flex flex-col gap-5">
      <p className="text-body text-ink">{t(`confirm.${category}`, { address })}</p>
      <div className="flex flex-col items-start gap-3">
        <Button type="button" onClick={confirm} disabled={busy}>
          {t("action")}
        </Button>
        {failure === undefined ? null : (
          <p role="alert" className="text-body-small text-danger-ink">
            {failure}
          </p>
        )}
      </div>
    </Panel>
  );
}
