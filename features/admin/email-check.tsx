"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/use-error-text";
import { sendTestEmailToMe } from "./actions";

type Outcome = { ok: true; to: string } | { ok: false; reason: string | null };

/**
 * The button that sends the admin a test e-mail, and what came of it: the address it went to, or
 * the server's own refusal, which is what tells a wrong password from a sender the relay refuses.
 */
export function EmailCheck() {
  const t = useTranslations("admin.health.email");
  const describe = useErrorText();
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const send = async () => {
    setPending(true);
    setOutcome(null);
    const result = await sendTestEmailToMe();
    setPending(false);
    const data = result?.data;
    if (data === undefined) {
      setOutcome({ ok: false, reason: describe(result?.serverError) ?? t("failed") });
      return;
    }
    setOutcome(data.ok ? { ok: true, to: data.to } : { ok: false, reason: data.reason });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="self-start">
        <Button variant="secondary" loading={pending} onClick={send}>
          {t("send")}
        </Button>
      </div>
      <div aria-live="polite">
        {outcome === null ? null : outcome.ok ? (
          <p className="text-body-small text-success-ink">{t("sent", { to: outcome.to })}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-body-small font-semibold text-danger-ink">{t("failed")}</p>
            {outcome.reason === null ? (
              <p className="text-body-small text-ink-muted">{t("where.none")}</p>
            ) : (
              <pre className="max-w-full overflow-x-auto rounded-cell border border-line bg-sunken px-cell-x py-cell-y font-mono text-body-small whitespace-pre-wrap text-ink">
                {outcome.reason}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
