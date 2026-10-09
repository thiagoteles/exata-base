"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const COPIED_FOR_MS = 2500;

/** The person's own link, shown in full so it can be read and typed, with a button that copies it. */
export function ReferralLink({ url }: { url: string }) {
  const t = useTranslations("account.referral");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FOR_MS);
    } catch {
      // The clipboard is blocked: the link is on screen, selectable, and that is enough.
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-field-label text-ink">{t("linkLabel")}</p>
      <p className="break-all rounded-control border border-line bg-sunken px-3 py-2 font-mono text-data text-ink">
        {url}
      </p>
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={copy}>
          {t("copy")}
        </Button>
        <span role="status" className="text-body-small text-ink-muted">
          {copied ? t("copied") : ""}
        </span>
      </div>
    </div>
  );
}
