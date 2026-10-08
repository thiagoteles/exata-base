"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/stamp";
import type { SaveStatus } from "./use-save-status";

type SaveBarProps = {
  status: SaveStatus;
  onSave: () => void;
  onDiscard: () => void;
};

/**
 * Appears when there is something unsaved, pinned to the bottom of the content. On success the
 * "Saved" stamp prints where the buttons were. Saving is confirmed here, never in a toast.
 */
export function SaveBar({ status, onSave, onDiscard }: SaveBarProps) {
  const t = useTranslations("patterns.saveBar");
  if (status === "clean") {
    return null;
  }
  return (
    <section
      aria-label={t("label")}
      className="sticky bottom-0 -mx-4 mt-8 flex animate-bar-in items-center justify-between gap-4 bg-sunken px-4 py-3 md:-mx-8 md:px-8"
    >
      <p className="text-body-small text-ink-muted max-sm:hidden">
        {status === "saved" ? "" : t("unsaved")}
      </p>
      {status === "saved" ? (
        <Stamp tone="done" className="animate-stamp">
          {t("saved")}
        </Stamp>
      ) : (
        <div className="flex gap-3 max-sm:w-full max-sm:flex-col-reverse">
          <Button variant="secondary" onClick={onDiscard} disabled={status === "saving"}>
            {t("discard")}
          </Button>
          <Button onClick={onSave} loading={status === "saving"}>
            {t("save")}
          </Button>
        </div>
      )}
    </section>
  );
}
